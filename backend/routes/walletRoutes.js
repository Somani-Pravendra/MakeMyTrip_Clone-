const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getWalletSummary } = require("../controllers/walletController");

router.get("/", authMiddleware, getWalletSummary);

module.exports = router;
