const express = require("express");
const router = express.Router();
const Flight = require("../models/Flight");
const authMiddleware = require("../middleware/authMiddleware");

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
const toDateInputValue = (date) => date.toISOString().split("T")[0];
const getDisplayPrice = (flight = {}) => {
    const farePrices = Array.isArray(flight.fares)
        ? flight.fares
            .map((fare) => Number(fare.price))
            .filter((price) => Number.isFinite(price))
        : [];

    const lowestFare = farePrices.length > 0 ? Math.min(...farePrices) : 0;
    return Number(flight.basePrice || 0) + lowestFare;
};

// @route   GET /api/flights
// @desc    Search flights
router.get("/", async (req, res) => {
    try {
        const { from, to, date } = req.query;
        let query = {};
        const fromValue = String(from || "").trim();
        const toValue = String(to || "").trim();
        if (fromValue) query.from = toCiRegex(fromValue);
        if (toValue) query.to = toCiRegex(toValue);
        if (date) query.date = date;

        const flights = await Flight.find(query);
        res.json(flights);
    } catch (err) {
        res.status(500).json({ message: "Server Error" });
    }
});

// @route   GET /api/flights/calendar
// @desc    Get cheapest fare across nearby dates for a route
router.get("/calendar", async (req, res) => {
    try {
        const { from, to, date, days = 8 } = req.query;
        const fromValue = String(from || "").trim();
        const toValue = String(to || "").trim();
        const totalDays = Math.min(Math.max(parseInt(days, 10) || 8, 1), 14);
        const baseDate = new Date(date);

        if (!fromValue || !toValue || Number.isNaN(baseDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: "from, to, and date are required for calendar fares"
            });
        }

        const endDate = new Date(baseDate);
        endDate.setDate(baseDate.getDate() + totalDays - 1);

        const flights = await Flight.find({
            from: toCiRegex(fromValue),
            to: toCiRegex(toValue),
            date: {
                $gte: toDateInputValue(baseDate),
                $lte: toDateInputValue(endDate)
            }
        }).sort({ date: 1, departureTime: 1 }).lean();

        const priceByDate = new Map();
        flights.forEach((flight) => {
            const currentPrice = getDisplayPrice(flight);
            const existingPrice = priceByDate.get(flight.date);
            if (existingPrice === undefined || currentPrice < existingPrice) {
                priceByDate.set(flight.date, currentPrice);
            }
        });

        const data = Array.from({ length: totalDays }, (_, index) => {
            const calendarDate = new Date(baseDate);
            calendarDate.setDate(baseDate.getDate() + index);
            const dateKey = toDateInputValue(calendarDate);
            return {
                date: dateKey,
                price: priceByDate.has(dateKey) ? priceByDate.get(dateKey) : null,
                available: priceByDate.has(dateKey)
            };
        });

        res.json({ success: true, data });
    } catch (err) {
        console.error("Error fetching flight calendar fares:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// @route   GET /api/flights/:id
// @desc    Get flight by ID
router.get("/:id", async (req, res) => {
    try {
        const flight = await Flight.findById(req.params.id);
        if (!flight) return res.status(404).json({ message: "Flight not found" });
        res.json(flight);
    } catch (err) {
        res.status(500).json({ message: "Server Error" });
    }
});

// @route   GET /api/flights/:id/seats
// @desc    Get dynamic occupied seats from bookings
router.get("/:id/seats", async (req, res) => {
    try {
        const Booking = require("../models/Booking");
        const bookings = await Booking.find({
            flightId: req.params.id,
            status: { $nin: ["Cancelled", "Fully Cancelled"] }
        });

        let allOccupiedSeats = [];
        bookings.forEach(booking => {
            if (booking.selectedSeats && Array.isArray(booking.selectedSeats)) {
                booking.selectedSeats.forEach(seat => {
                    const seatId = String(seat?.id || seat || "").trim().toUpperCase();
                    if (seatId) allOccupiedSeats.push(seatId);
                });
            }
        });

        // Add hardcoded occupied seats from the Flight model if any
        const flight = await Flight.findById(req.params.id);
        if (flight && flight.occupiedSeats) {
            allOccupiedSeats = [...new Set([
                ...allOccupiedSeats,
                ...flight.occupiedSeats.map((seat) => String(seat || "").trim().toUpperCase()).filter(Boolean)
            ])];
        }

        res.json(allOccupiedSeats);
    } catch (err) {
        console.error("Error fetching dynamic seats:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

router.put("/:id/seats", authMiddleware, async (req, res) => {
    try {
        const requestedSeats = Array.isArray(req.body?.seats)
            ? [...new Set(req.body.seats.map((seat) => String(seat || "").trim()).filter(Boolean))]
            : [];
        const flight = await Flight.findById(req.params.id);

        if (!flight) return res.status(404).json({ message: "Flight not found" });
        if (requestedSeats.length === 0) {
            return res.status(400).json({ message: "At least one seat is required" });
        }

        const occupiedSeats = Array.isArray(flight.occupiedSeats) ? flight.occupiedSeats : [];
        const occupiedSeatSet = new Set(occupiedSeats.map((seat) => String(seat).trim()).filter(Boolean));
        const newlyOccupiedSeats = requestedSeats.filter((seat) => !occupiedSeatSet.has(seat));

        flight.occupiedSeats = [...new Set([...occupiedSeatSet, ...requestedSeats])];
        flight.availableSeats = Math.max(0, Number(flight.availableSeats || 0) - newlyOccupiedSeats.length);

        await flight.save();
        res.json({
            message: newlyOccupiedSeats.length > 0 ? "Seats reserved successfully" : "Seats were already reserved",
            flight
        });
    } catch (err) {
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;
