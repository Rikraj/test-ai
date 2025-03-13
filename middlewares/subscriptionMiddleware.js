import {checkStatus} from "../services/subscriptionServices.js";

export const validateStatus = async (req, res, next) => {
  const userId = req.user.userId;

  try {
    // check user subscription status
    const { status } = await checkStatus(userId);
    if (status !== "trialing" && status !== "active") {
      return res.status(401).json({ errors: ["Access denied"] });
    }
    next();
  } catch (error) {
    res.status(500).json({ errors: [error.message] });
  }
};
