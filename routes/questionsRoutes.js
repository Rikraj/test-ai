import express from "express";
import { validateToken } from "../middlewares/authMiddleware.js";
import { getQuestions, getTopics, updateTopic } from "../services/questionsServices.js";

const router = express.Router();

const fetchQuestions = async (req, res) => {
  try {
    const topicId = req.params.id;
    const result = await getQuestions(topicId);
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ errors: [e.message] });
  }
};
const fetchTopics = async (req, res) => {
  const userId = req.user.userId;
  try {
    const result = await getTopics(userId);
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ errors: [e.message] });
  }
};

const updateTopicStatus = async (req, res) => {
  try {
    const topicId = req.params.id;
    const topicStatus = req.query.status;
    const result = await updateTopic(topicId, topicStatus);
    res.status(200).json(result);
  } catch(e) {
    res.status(500).json({ errors: [e.message] });
  }
};

// param vs query
router.get("/questions/:id", validateToken, fetchQuestions);
router.get("/topics", validateToken, fetchTopics);
router.post("/topic/update/:id", validateToken, updateTopicStatus);

export default router;
