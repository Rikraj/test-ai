import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import questionsRoutes from "./routes/questionsRoutes.js";

dotenv.config();

const PORT = process.env.PORT;

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", authRoutes);
app.use("/subscription", subscriptionRoutes);
app.use("/upload", uploadRoutes);
app.use("/api", questionsRoutes);

// Test DB connection
pool.connect()
  .then(() => console.log("✅ Connected to PostgreSQL"))
  .catch((err) => console.error("❌ Database Connection Error", err));

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});