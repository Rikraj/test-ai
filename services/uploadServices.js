import { YoutubeTranscript } from "youtube-transcript";
import { getDocument, OPS } from "pdfjs-dist";
import { existsSync } from "fs";
import sharp from "sharp";
import openai from "../config/openAIConfig.js";

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
  const prompt = `
  What is this image about, respond concisely. If the image is corrupted or blank, respond with empty string`;

  const response = await openai.chat.completions.create({
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
    // temperature: 0.7
  });

  console.log("From Image: ", response.choices[0].message.content);
  // 'The image contains a page from the book "Turtles All the Way Down" by John Green. The text describes a scene where the narrator is lying next to someone named Davis on the edge of a dock, sharing a moment of intimacy by looking at the summer sky. The passage reflects on the connection between people who share a perspective on the world around them.'

  return { text: response.choices[0].message.content };
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
  maxWidth = 1024,
  maxHeight = 1024
) => {
  try {
    // Ensure the file exists
    if (!existsSync(imgPath)) {
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

// The image features the text "काॅनरा बैंक" (Canara Bank) prominently displayed in white against a blue background. Additionally, there is a logo or graphic element  t that appears to be associated with the bank, featuring a yellow and white design element that may represent financial services or connectivity.

// ### Analysis:
// 1. **Color Scheme**:
//    - The use of blue can signify trust and stability, which are essential qualities for a banking institution.
//    - The white text contrasts well with the blue background, enhancing readability.

// 2. **Branding**:
//    - Canara Bank is a well-known bank in India, and the logo/image signifies its branding well.
//    - The inclusion of both Hindi and English reflects the bank's attempt to cater to a diverse customer base.

// 3. **Purpose**:
//    - The image likely serves as an advertisement or a promotional piece for the bank, potentially highlighting its services or products.

// 4. **Design Elements**:
//    - The simplicity of the design helps in conveying the message effectively without clutter, making it visually appealing.

// This image can be useful for understanding branding strategies in the banking sector, particularly in multilingual contexts.
// The image features text on a blue background with two distinct parts.

// 1. **Text Content**: The top part appears to contain stylized characters, possibly in a specific script, while the bottom part states "Canara Bank," which suggests it is associated with a banking institution.

// 2. **Color Scheme**: The use of blue as the background color can evoke feelings of trust and reliability, which are important attributes for a bank.

// 3. **Font Style**: The font appears to be bold and clear, making it easily readable. This is crucial for brand recognition and visibility.

// 4. **Design Elements**: There is a small graphical element, possibly a logo or icon, accompanying the text, which might symbolize banking or financial services.  

// ### Analysis for Notes:
// - **Branding**: The image is effective for branding purposes due to its clear display of the bank's name and professional color choice.
// - **Audience Perception**: The visual elements likely aim to establish credibility and attract customers looking for banking services.
// - **Cultural Context**: The use of specific characters may indicate regional or cultural significance, appealing to a targeted demographic.

// Overall, the image is designed to convey professionalism and trust associated with the banking sector.
// The image features text in two languages, with the top portion in Hindi that translates to "Government of India Undertaking." The background is a solid blue, which is often associated with trust and stability.

// The use of Hindi alongside English indicates an effort to communicate with a bilingual audience, reflecting the official nature of the content. The phrase suggests a backing or initiative from the government, which may pertain to a public service or undertaking.

// When analyzing the style, the bold font emphasizes the importance and authority of the message, making it clear that this is an official communication. The simplicity of the design ensures that the focus remains on the message without distractions.

// In summary, this image serves to establish credibility and authority through its official government wording and design choices.
