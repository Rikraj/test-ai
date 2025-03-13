import express from "express";
import { body, validationResult } from "express-validator";
import { registerUser, loginUser, removeUserInfo } from "../services/authServices.js";
import { validateToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// auth validation
const validateSignup = [
  body("name").notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Invalid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

const validateSignin = [
  body("email").isEmail().withMessage("Invalid email"),
  body("password").notEmpty().withMessage("Invalid password"),
];

const signup = async (req, res) => {
  const result = validationResult(req).formatWith((error) => error.msg);
  const errors = result.array();
  if (errors.length > 0) {
    return res.status(400).json({ errors: errors });
  }

  const { name, email, password } = req.body;

  try {
    const user = await registerUser(name, email, password);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ errors: [error.message] });
  }
};

const signin = async (req, res) => {
  const result = validationResult(req).formatWith((error) => error.msg);
  const errors = result.array();
  if (errors.length > 0) {
    return res.status(400).json({ errors: errors });
  }

  const { email, password } = req.body;

  try {
    const user = await loginUser(email, password);
    res.status(200).json(user);
  } catch (error) {
    res.status(400).json({ errors: [error.message] });
  }
};

const deleteAccount = async (req, res) => {
  const userId = req.user.userId; // Extracted from JWT middleware
  try {
    const result = await removeUserInfo(userId);
    res.status(200).json(result);
  }
  catch (error) {
    res.status(500).json({errors: [error.message]});
  }
};

router.post("/signup", ...validateSignup, signup);
router.post("/signin", ...validateSignin, signin);
router.delete("/delete-account", validateToken, deleteAccount);

export default router;
