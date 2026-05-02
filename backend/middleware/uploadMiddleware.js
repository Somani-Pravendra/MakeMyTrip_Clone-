const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

// Use random hex name — prevents path traversal and filename guessing
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const randomName = crypto.randomBytes(16).toString("hex");
    cb(null, `${randomName}${ext}`);
  }
});

const ALLOWED_EXTENSIONS = new Set([".csv", ".json", ".jpg", ".jpeg", ".png", ".webp"]);

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.has(ext)) {
    cb(null, true);
  } else {
    cb(new Error("File type not allowed. Accepted: CSV, JSON, JPG, PNG, WEBP"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  }
});

module.exports = upload;
