const express = require("express");
const { sendChatMessage, getChatHealth } = require("../controllers/chatController");

const router = express.Router();

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const chatRequestBuckets = new Map();

const cleanupChatBuckets = () => {
  const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
  for (const [key, bucket] of chatRequestBuckets.entries()) {
    if (!bucket || bucket.windowStart < cutoff) {
      chatRequestBuckets.delete(key);
    }
  }
};

setInterval(cleanupChatBuckets, RATE_LIMIT_WINDOW_MS).unref?.();

const getChatClientKey = (req) => {
  const forwardedFor = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwardedFor || req.ip || req.connection?.remoteAddress || "unknown";
};

const chatRateLimit = (req, res, next) => {
  const key = getChatClientKey(req);
  const now = Date.now();
  const bucket = chatRequestBuckets.get(key);

  if (!bucket || now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
    chatRequestBuckets.set(key, {
      windowStart: now,
      count: 1
    });
    return next();
  }

  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - bucket.windowStart)) / 1000);
    return res.status(429).json({
      success: false,
      message: "Too many chat requests. Please wait a moment and try again.",
      retryAfterSeconds
    });
  }

  bucket.count += 1;
  return next();
};

router.get("/health", getChatHealth);
router.post("/message", chatRateLimit, sendChatMessage);

module.exports = router;
