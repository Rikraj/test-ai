import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import pool from "../config/db.js";
import { OAuth2Client } from "google-auth-library";

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

export const loginWithGoogle = async (idToken) => {
  console.log(idToken);

  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  // Verify Google ID token

  // // after acquiring an oAuth2Client...
  // const tokenInfo = await client.getTokenInfo(idToken);

  // // take a look at the scopes originally provisioned for the access token
  // // console.log(tokenInfo.scopes);
  // console.log(tokenInfo);

  // const ticket = await client.verifyIdToken({
  //   idToken: idToken,
  //   audience: process.env.GOOGLE_CLIENT_ID, // Your web client ID
  // });

  // console.log(ticket);

  // const payload = ticket.getPayload();
  // const { sub: googleId, email, name } = payload;

  const response = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    }
  );
  const userInfo = await response.json();
  console.log(userInfo);
  const {sub: googleId, email, name} = userInfo;

  // Check if user already exists
  let user = await getUserByEmail(email);

  if (user) {
    // Link Google ID if user exists but hasn't linked Google yet
    if (!user.google_id) {
      user = await pool.query(
        "UPDATE users SET google_id = $1 WHERE email = $2 RETURNING *",
        [googleId, email]
      );
    }
  } else {
    // Create new user if they don't exist
    user = await pool.query(
      "INSERT INTO users (name, email, google_id) VALUES ($1, $2, $3) RETURNING *",
      [name, email, googleId]
    );
  }

  const token = generateToken(user.id);
  return { id: user.id, name: user.name, email: user.email, token };
};
