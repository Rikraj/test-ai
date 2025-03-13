import dotenv from "dotenv";
import pool from "../config/db.js";

dotenv.config();

const checkSubscription = async (userId) => {
  const query = `
    SELECT id, plan_type FROM subscriptions
    WHERE user_id = $1 AND start_date <= $2 AND end_date > $2`;
  const values = [userId, new Date()];
  const { rows } = await pool.query(query, values);
  return rows[0];
};
const checkTrial = async (userId) => {
  const query = "SELECT id FROM subscriptions WHERE user_id = $1 AND plan_type = 'trial'";
  const result = await pool.query(query, [userId]);
  return result.rowCount === 0;
};

export const checkStatus = async (userId) => {
  const current = await checkSubscription(userId);
  if (current)
    return { status: current.plan_type === "trial" ? "trialing" : "active" };

  const isEligible = await checkTrial(userId);
  if (isEligible) return { status: "eligible" };
  return { status: "none" };
};

export const setTrial = async (userId) => {
    const trialStart = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialStart.getDate() + 3); // Add 3 days

    await pool.query(
        "INSERT INTO subscriptions (user_id, plan_type, start_date, end_date) VALUES ($1, 'trial', $2, $3)",
        [userId, trialStart, trialEnd]
    );

    return { message: "Trial started successfully.", end_date: trialEnd };
};
