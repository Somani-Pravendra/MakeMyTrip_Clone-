const express = require("express");
const router = express.Router();
const Train = require("../models/Train");

const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const CITY_ALIASES = {
    bengaluru: ["bengaluru", "bangalore", "banglore"],
    mumbai: ["mumbai", "bombay"],
    delhi: ["delhi", "new delhi"],
    kolkata: ["kolkata", "calcutta"]
};
const getCityVariants = (value = "") => {
    const cleaned = String(value || "").trim().toLowerCase();
    if (!cleaned) return [];

    for (const aliases of Object.values(CITY_ALIASES)) {
        if (aliases.includes(cleaned)) {
            return aliases;
        }
    }

    return [cleaned];
};
const toCiRegex = (value = "") => {
    const variants = getCityVariants(value).map(escapeRegex);
    return new RegExp(`^(${variants.join("|")})$`, "i");
};

// @route   GET /api/trains
// @desc    Get trains with filters
router.get("/", async (req, res) => {
    try {
        const { from, to, date } = req.query;
        let query = { isActive: true };
        const fromValue = String(from || "").trim();
        const toValue = String(to || "").trim();

        if (fromValue) query.from = toCiRegex(fromValue);
        if (toValue) query.to = toCiRegex(toValue);
        if (date) query.date = date;

        const trains = await Train.find(query).sort({ departureTime: 1 });
        res.json(trains);
    } catch (err) {
        res.status(500).json({ message: "Server Error" });
    }
});

// @route   GET /api/trains/:id
// @desc    Get single train by ID
router.get("/:id", async (req, res) => {
    try {
        const train = await Train.findById(req.params.id);
        if (!train) return res.status(404).json({ message: "Train not found" });
        res.json(train);
    } catch (err) {
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;
