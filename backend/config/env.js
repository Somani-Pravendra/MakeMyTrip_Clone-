require("dotenv").config();

const getEnv = (name, fallback = "") => {
  const value = process.env[name];
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
};

const getRequiredEnv = (name) => {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const parseBoolean = (value, fallback = false) => {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
};

const isPlaceholderValue = (value) => {
  if (typeof value !== "string") return true;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  return [
    "your_openai_api_key_here",
    "replace-with-your-openai-api-key",
    "replace_with_your_openai_api_key",
    "changeme",
    "change-me",
    "example"
  ].some((placeholder) => normalized === placeholder || normalized.includes(placeholder));
};

const env = getEnv("NODE_ENV", "development");
const isProduction = env === "production";

const config = {
  env,
  isProduction,
  port: Number(getEnv("PORT", "5000")) || 5000,
  mongoUri: getRequiredEnv("MONGO_URI"),
  jwtSecret: getRequiredEnv("JWT_SECRET"),
  sessionSecret: getRequiredEnv("SESSION_SECRET"),
  frontendUrl: getRequiredEnv("FRONTEND_URL"),
  googleClientId: getEnv("GOOGLE_CLIENT_ID"),
  googleClientSecret: getEnv("GOOGLE_CLIENT_SECRET"),
  googleCallbackUrl: getEnv("GOOGLE_CALLBACK_URL"),
  emailUser: getEnv("EMAIL_USER"),
  emailPass: getEnv("EMAIL_PASS"),
  openaiApiKey: getEnv("OPENAI_API_KEY"),
  openaiChatModel: getEnv("OPENAI_CHAT_MODEL", "gpt-5-mini"),
  openaiChatReasoningEffort: getEnv("OPENAI_CHAT_REASONING_EFFORT", "low"),
  enableRequestLogging: parseBoolean(process.env.ENABLE_REQUEST_LOGS, !isProduction),
  authDebugOtp: parseBoolean(process.env.AUTH_DEBUG_OTP, false),
  sessionCookieName: getEnv("SESSION_COOKIE_NAME", "mmt.sid")
};

config.googleAuthEnabled = Boolean(config.googleClientId && config.googleClientSecret);
config.openaiEnabled = Boolean(config.openaiApiKey) && !isPlaceholderValue(config.openaiApiKey);
config.openaiConfigured = config.openaiEnabled;

module.exports = config;
