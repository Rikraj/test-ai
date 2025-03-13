import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import pool from "../config/db.js";

dotenv.config();

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createUser = async (name, email, password) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const query = `
    INSERT INTO users (name, email, password) 
    VALUES ($1, $2, $3) RETURNING id, name, email`;
  const values = [name, email, hashedPassword];
  const { rows } = await pool.query(query, values);
  return rows[0];
};

const getUserByEmail = async (email) => {
  const query = "SELECT * FROM users WHERE email = $1";
  const { rows } = await pool.query(query, [email]);
  return rows[0];
};

const getUserById = async (userId) => {
  const query = "SELECT * FROM users WHERE id = $1";
  const { rows } = await pool.query(query, [userId]);
  return rows[0];
};

export const registerUser = async (name, email, password) => {
  const existingUser = await getUserByEmail(email);
  if (existingUser) throw new Error("User already exists");

  const user = await createUser(name, email, password);
  const token = generateToken(user.id);

  return { ...user, token };
};

export const loginUser = async (email, password) => {
  const user = await getUserByEmail(email);
  if (!user) throw new Error("User does not exist");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error("Invalid password");

  const token = generateToken(user.id);
  return { id: user.id, name: user.name, email: user.email, token };
};

export const removeUserInfo = async (userId) => {
  const user = await getUserById(userId);
  if (!user) throw new Error("User does not exist");

  // Delete user-related data (e.g., subscriptions, uploads)
  await pool.query("DELETE FROM subscriptions WHERE user_id = $1", [userId]);
  // await pool.query("DELETE FROM uploads WHERE user_id = $1", [userId]);

  // Delete user account
  await pool.query("DELETE FROM users WHERE id = $1", [userId]);

  return { message: "Account deleted successfully" };
};
