import jwt from "jsonwebtoken";

export const validateToken = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) return res.status(401).json({ errors: ["Access denied"] });

  try {
      const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
      req.user = decoded; // Attach user info
      next();
  } catch (error) {
      res.status(401).json({ errors: ["Invalid token"] });
  }
};