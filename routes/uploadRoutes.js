import express from "express";
import { validateToken } from "../middlewares/authMiddleware.js";
import { validateStatus } from "../middlewares/subscriptionMiddleware.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { unlinkSync } from "fs";
import {
  linkToText,
  pdfToText,
  imgToText,
  imgToBase64
} from "../services/uploadServices.js";
import { createQuestions } from "../services/questionsServices.js";

const router = express.Router();

// Define __dirname manually (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(path.dirname(__filename));

// Configure multer storage (stores files in "temp" folder)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "temp"));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Serve uploaded files statically (optional)
router.use("/temp", express.static(path.join(__dirname, "temp")));

const uploadPdf = async (req, res) => {
  const userId = req.user.userId;
  if (!req.file) {
    return res.status(400).json({ errors: ["No file uploaded"] });
  }
  const filePath = path.join(__dirname, "temp", req.file.filename);
  const fileExt = path.extname(req.file.originalname).toLowerCase();
  try {

    if (fileExt !== ".pdf") {
      res.status(400).json({ errors: ["Upsupported file format"] });
    } else {
      // Pdf -> text + img -> text service
      const { text } = await pdfToText(filePath);
      // createQuestions service
      const result = await createQuestions(userId, text);
      res.status(200).json(result);
    }
  } catch (error) {
    res.status(500).json({ errors: [error.message] });
  }

  unlinkSync(filePath);
  // console.log("file removed");
};

const uploadImg = async (req, res) => {
  const userId = req.user.userId;
  if (!req.file) {
    return res.status(400).json({ errors: ["No file uploaded"] });
  }
  const filePath = path.join(__dirname, "temp", req.file.filename);
  const fileExt = path.extname(req.file.originalname).toLowerCase();
  try {
    
    if (
      fileExt !== ".png" &&
      fileExt !== ".jpg" &&
      fileExt !== ".jpeg" &&
      fileExt !== ".webp" &&
      fileExt !== ".avif"
    ) {
      res.status(400).json({ errors: ["Upsupported file format"] });
    } else {
      // Img -> text service
      const imageBase64 = await imgToBase64(filePath);
      const { text } = await imgToText(imageBase64);
      console.log("Text: ", text);
      // createQuestions service
      const result = await createQuestions(userId, text);
      res.status(200).json(result);
    }
  } catch (error) {
    res.status(500).json({ errors: [error.message] });
  }

  unlinkSync(filePath);
  // console.log("file removed");
};

const uploadLink = async (req, res) => {
  const userId = req.user.userId;
  if (!req.body.link) {
    return res.status(400).json({ errors: ["No link uploaded"] });
  }
  try {
    const { link } = req.body;
    // Link -> text service
    const { text } = await linkToText(link);
    // createQuestions service
    const result = await createQuestions(userId, text);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ errors: [error.message] });
  }
};

const uploadText = async (req, res) => {
  const userId = req.user.userId;
  if (!req.body.text) {
    return res.status(400).json({ errors: ["No text uploaded"] });
  }
  try {
    const { text } = req.body;
    // createQuestions service
    const result = await createQuestions(userId, text);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ errors: [error.message] });
  }
};

router.post(
  "/pdf",
  validateToken,
  validateStatus,
  upload.single("file"),
  uploadPdf
);
router.post(
  "/img",
  validateToken,
  validateStatus,
  upload.single("file"),
  uploadImg
);
router.post("/link", validateToken, validateStatus, uploadLink);
router.post("/text", validateToken, validateStatus, uploadText);

export default router;
