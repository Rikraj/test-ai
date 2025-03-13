import express from "express";
import { validateToken } from "../middlewares/authMiddleware.js";
import { checkStatus, setTrial } from "../services/subscriptionServices.js";

const router = express.Router();

// eligible, trialing, active, none
const subscriptionStatus = async (req, res) => {
  const userId = req.user.userId;

  try {
    const result = await checkStatus(userId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ errors: [error.message] });
  }
};

const startTrial = async (req, res) => {
  const userId = req.user.userId;
  try {
    const check = await checkStatus(userId);
    if (check.status !== "eligible") {
        return res.status(400).json({ errors: ["No available trial"] });
    }
    const result = await setTrial(userId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ errors: [error.message] });
  }
};

const startSubscription = () => undefined;

router.get("/status", validateToken, subscriptionStatus);
router.post("/payment", validateToken, startSubscription);
router.post("/trial", validateToken, startTrial);

export default router;
