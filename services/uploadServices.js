import { YoutubeTranscript } from "youtube-transcript";
import { getDocument, OPS } from "pdfjs-dist";
import { existsSync } from "fs";
import sharp from "sharp";
import openai from "../config/openAIConfig.js";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

export const linkToText = async (link) => {
  let data;
  try {
    data = await YoutubeTranscript.fetchTranscript(link, { lang: "en-US" });
  } catch {
    try {
      data = await YoutubeTranscript.fetchTranscript(link, { lang: "en-GB" });
    } catch {
      try {
        data = await YoutubeTranscript.fetchTranscript(link, { lang: "en-IN" });
      } catch {
        try {
          data = await YoutubeTranscript.fetchTranscript(link, { lang: "en" });
        } catch (e) {
          throw e;
        }
      }
    }
  }

  const text = data.map((d) => d.text).join(" ");
  return { text };
};

export const imgToText = async (base64Image) => {
  // const prompt = `
  // What is this image about, respond concisely. If the image is corrupted or blank, respond with empty string`;

  const prompt = `
  Generate text from image. Ensure:
  1. Recognize text and mathematical formula
  2. Recognize and discuss concepts for scientific diagrams
  3. Analyze and get insights from data tables and charts
  4. For any other image respond with empty string`;

  const ExtractedText = z.object({
    text: z.string(),
  });

  const response = await openai.beta.chat.completions.parse({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    temperature: 0.3,
    response_format: zodResponseFormat(ExtractedText, "text"),
  });

  const text = response.choices[0].message.parsed;

  // console.log("From Image: ", response.choices[0].message.content);
  // 'The image contains a page from the book "Turtles All the Way Down" by John Green. The text describes a scene where the narrator is lying next to someone named Davis on the edge of a dock, sharing a moment of intimacy by looking at the summer sky. The passage reflects on the connection between people who share a perspective on the world around them.'

  return text;
};

const convertToRGBA = (data, width, height, kind) => {
  let rgba;

  if (kind === 1) {
    // Grayscale
    rgba = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i++) {
      rgba[i * 4] = data[i]; // R
      rgba[i * 4 + 1] = data[i]; // G
      rgba[i * 4 + 2] = data[i]; // B
      rgba[i * 4 + 3] = 255; // A
    }
  } else if (kind === 2) {
    // RGB
    rgba = new Uint8ClampedArray((data.length / 3) * 4);
    for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
      rgba[j] = data[i]; // R
      rgba[j + 1] = data[i + 1]; // G
      rgba[j + 2] = data[i + 2]; // B
      rgba[j + 3] = 255; // A
    }
  } else {
    rgba = new Uint8Array((data.length / 4) * 4);
    for (let i = 0, j = 0; i < data.length; i += 4, j += 4) {
      rgba[j] = data[i]; // R
      rgba[j + 1] = data[i + 1]; // G
      rgba[j + 2] = data[i + 2]; // B
      rgba[j + 3] = data[i + 3]; // A
    }
  }

  return rgba;
};

export const imgToBase64 = async (
  imgPath,
  maxWidth = 720,
  maxHeight = 720
) => {
  try {
    // Ensure the file exists
    if (!existsSync(imgPath)) {
      console.log("Error: File does not exist");
      throw new Error("File does not exist");
    }

    // Load and convert the image to PNG (auto-handles JPEG, WEBP, etc.)
    const buffer = await sharp(imgPath)
      .resize({ width: maxWidth, height: maxHeight, fit: "inside" }) // Resize while keeping aspect ratio
      .png({ quality: 80 }) // Compress PNG (80% quality)
      .toBuffer();

    // Convert the PNG buffer to Base64
    const base64 = buffer.toString("base64");
    return base64;
  } catch (error) {
    console.error("Error converting image:", error.message);
    return null;
  }
};

export const pdfToText = async (pdfPath) => {
  const loadingTask = getDocument({
    url: pdfPath,
    standardFontDataUrl: "node_modules/pdfjs-dist/standard_fonts/",
  });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  let numImgs = 0;
  let text = "";

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    // Extract text
    text += textContent.items.map((item) => item.str).join(" ") + "\n";

    // maximum number of images processed in a single pdf document (optional)
    if (numImgs >= 100) continue;

    // Extract images + convert them to text
    const operatorList = await page.getOperatorList();
    let imgContent = "";
    for (let j = 0; j < operatorList.fnArray.length; j++) {
      if (operatorList.fnArray[j] === OPS.paintImageXObject) {
        const imgName = operatorList.argsArray[j][0];

        await new Promise((resolve) => {
          page.objs.get(imgName, async (imgObj) => {
            if (imgObj && imgObj.data) {
              const { data, width, height, kind } = imgObj;

              const rgba = convertToRGBA(data, width, height, kind);
              if (!rgba) return resolve();
              const rgbaBuffer = Buffer.from(rgba);
              const pngBuffer = await sharp(rgbaBuffer, {
                raw: {
                  width: width,
                  height: height,
                  channels: 4, // RGBA
                },
              })
                .resize({ width: 720, height: 720, fit: "inside" }) // Resize while keeping aspect ratio
                .png({ quality: 80 }) // Compress PNG (80% quality)
                .toBuffer();

              // Convert the PNG buffer to Base64
              const base64Image = pngBuffer.toString("base64");

              numImgs += 1;
              // process img using openai API
              const currImgContent = await imgToText(base64Image);

              imgContent += currImgContent.text + "\n";
            }
            resolve();
          });
        });
      }
    }

    text += imgContent;
  }
  // console.log("Response: ", text);
  return { text };
};