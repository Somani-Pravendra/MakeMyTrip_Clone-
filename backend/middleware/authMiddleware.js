const jwt = require("jsonwebtoken");
const User = require("../models/User");
const config = require("../config/env");

const authMiddleware = async (req, res, next) => {
  if (req.method === "OPTIONS") return next();

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch {
      return res.status(401).json({ message: "Session expired. Please log in again." });
    }

    // Always fetch from DB — ensures isAdmin, account existence are live values
    const user = await User.findById(decoded.id).select("-password -resetPasswordOTP -resetPasswordExpires -resetPasswordOtpAttempts -resetPasswordOtpBlockedUntil");

    if (!user) {
      return res.status(401).json({ message: "Account not found. Please log in again." });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("authMiddleware error:", error);
    return res.status(401).json({ message: "Authentication failed" });
  }
};

module.exports = authMiddleware;
