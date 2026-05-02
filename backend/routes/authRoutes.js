const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { signup, login, forgotPassword, verifyOTP, resetPassword, deleteAccount } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const config = require("../config/env");

const router = express.Router();

// ── Rate limiters ──────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Please try again after 15 minutes." }
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many signup attempts. Please try again after an hour." }
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many password reset requests. Please try again after 15 minutes." }
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many OTP attempts. Please try again after 15 minutes." }
});
// ──────────────────────────────────────────────────────────────

router.post("/signup", signupLimiter, signup);
router.post("/login", loginLimiter, login);
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/verify-otp", otpLimiter, verifyOTP);
router.post("/reset-password", otpLimiter, resetPassword);

router.delete("/delete-account", authMiddleware, (req, res) => {
  deleteAccount(req, res);
});

// Google Login
router.get("/google", (req, res, next) => {
  if (!config.googleAuthEnabled) {
    return res.status(503).json({ message: "Google login is not configured" });
  }

  return passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account"
  })(req, res, next);
});

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: `${config.frontendUrl}/login` }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user._id, isAdmin: req.user.isAdmin },
      config.jwtSecret,
      { expiresIn: "7d" }
    );

    req.session.googleAuthResult = {
      token,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        isAdmin: req.user.isAdmin
      }
    };

    req.session.save((error) => {
      if (error) {
        return res.redirect(`${config.frontendUrl}/login?error=google-session`);
      }

      return res.redirect(`${config.frontendUrl}/google-callback?token=${token}`);
    });
  }
);

router.get("/google/session", (req, res) => {
  const authResult = req.session?.googleAuthResult;

  if (!authResult?.token || !authResult?.user) {
    return res.status(404).json({ message: "No Google login session found" });
  }

  const responsePayload = {
    success: true,
    token: authResult.token,
    user: authResult.user
  };

  delete req.session.googleAuthResult;
  req.session.save((error) => {
    if (error) {
      return res.status(500).json({ message: "Unable to finalize Google login" });
    }

    return res.json(responsePayload);
  });
});

router.get("/me", authMiddleware, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

module.exports = router;
