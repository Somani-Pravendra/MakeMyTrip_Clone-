const express = require("express");
const { getPublicOffers } = require("../controllers/offerController");

const router = express.Router();

router.get("/", getPublicOffers);

module.exports = router;
