const express = require("express");
const router = express.Router();
const Bus = require("../models/Bus");

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
const parseDateInput = (value) => {
    if (!value && value !== 0) return null;

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
    }

    const stringValue = String(value).trim();
    if (!stringValue) return null;

    const dateOnlyMatch = stringValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
        const [, year, month, day] = dateOnlyMatch;
        const parsed = new Date(Number(year), Number(month) - 1, Number(day));
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    const parsed = new Date(stringValue);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};
const toDateInputValue = (value) => {
    const parsed = parseDateInput(value);
    if (!parsed) return "";

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};
const getMinAvailablePrice = (buses = []) => {
    const prices = buses
        .filter((bus) => Number(bus.availableSeats || 0) > 0)
        .map((bus) => Number(bus.price))
        .filter((price) => Number.isFinite(price) && price >= 0);

    return prices.length > 0 ? Math.min(...prices) : null;
};

// @route   GET /api/buses
// @desc    Get all buses with optional search filters
// @access  Public
router.get("/", async (req, res) => {
    try {
        const { from, to, date } = req.query;
        let query = { status: "Active" };
        const fromValue = String(from || "").trim();
        const toValue = String(to || "").trim();
        const dateValue = toDateInputValue(date);
        
        // Apply search filters if provided
        if (fromValue) query.from = toCiRegex(fromValue);
        if (toValue) query.to = toCiRegex(toValue);
        if (dateValue) query.date = dateValue;

        const buses = await Bus.find(query).sort({ departureTime: 1 });
        
        res.status(200).json({
            success: true,
            count: buses.length,
            data: buses
        });
    } catch (err) {
        console.error("Error fetching buses:", err);
        res.status(500).json({ 
            success: false,
            message: "Server Error", 
            error: err.message 
        });
    }
});

// @route   GET /api/buses/calendar
// @desc    Get nearby-date bus availability and lowest price
// @access  Public
router.get("/calendar", async (req, res) => {
    try {
        const { from, to, date, days = 8 } = req.query;
        const fromValue = String(from || "").trim();
        const toValue = String(to || "").trim();
        const baseDate = parseDateInput(date);
        const totalDays = Math.min(Math.max(parseInt(days, 10) || 8, 1), 14);

        if (!fromValue || !toValue || !baseDate) {
            return res.status(400).json({
                success: false,
                message: "from, to, and date are required for bus calendar availability"
            });
        }

        const endDate = new Date(baseDate);
        endDate.setDate(baseDate.getDate() + totalDays - 1);

        const buses = await Bus.find({
            status: "Active",
            from: toCiRegex(fromValue),
            to: toCiRegex(toValue),
            date: {
                $gte: toDateInputValue(baseDate),
                $lte: toDateInputValue(endDate)
            }
        }).sort({ date: 1, departureTime: 1 }).lean();

        const busesByDate = new Map();
        buses.forEach((bus) => {
            const dateKey = toDateInputValue(bus.date);
            if (!dateKey) return;

            const existing = busesByDate.get(dateKey) || [];
            existing.push(bus);
            busesByDate.set(dateKey, existing);
        });

        const data = Array.from({ length: totalDays }, (_, index) => {
            const calendarDate = new Date(baseDate);
            calendarDate.setDate(baseDate.getDate() + index);
            const dateKey = toDateInputValue(calendarDate);
            const busesForDate = busesByDate.get(dateKey) || [];
            const lowestAvailablePrice = getMinAvailablePrice(busesForDate);

            return {
                date: dateKey,
                price: lowestAvailablePrice,
                available: lowestAvailablePrice !== null,
                seatsAvailable: busesForDate.reduce((sum, bus) => sum + Math.max(Number(bus.availableSeats) || 0, 0), 0),
                totalServices: busesForDate.length
            };
        });

        res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("Error fetching bus calendar availability:", err);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: err.message
        });
    }
});

// @route   GET /api/buses/:id/seats
// @desc    Get occupied seats for a bus from active bookings
// @access  Public
router.get("/:id/seats", async (req, res) => {
    try {
        if (!Bus.db.base.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid bus ID" });
        }

        const Booking = require("../models/Booking");
        const bookings = await Booking.find({
            busId: req.params.id,
            status: { $nin: ["Cancelled", "Fully Cancelled"] }
        }).select("selectedSeats").lean();

        const occupiedSeats = [];
        bookings.forEach((booking = {}) => {
            (Array.isArray(booking.selectedSeats) ? booking.selectedSeats : []).forEach((seat) => {
                const seatId = String(seat?.id || seat || "").trim().toUpperCase();
                if (seatId) occupiedSeats.push(seatId);
            });
        });

        res.status(200).json({ success: true, data: [...new Set(occupiedSeats)] });
    } catch (err) {
        console.error("Error fetching bus seats:", err);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: err.message
        });
    }
});

// @route   GET /api/buses/:id
// @desc    Get single bus by ID
// @access  Public
router.get("/:id", async (req, res) => {
    try {
        const bus = await Bus.findById(req.params.id);
        
        if (!bus) {
            return res.status(404).json({ 
                success: false,
                message: "Bus not found" 
            });
        }
        
        res.status(200).json({
            success: true,
            data: bus
        });
    } catch (err) {
        console.error("Error fetching bus:", err);
        res.status(500).json({ 
            success: false,
            message: "Server Error", 
            error: err.message 
        });
    }
});

module.exports = router;
