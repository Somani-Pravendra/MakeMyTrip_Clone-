const express = require("express");
const router = express.Router();
const Hotel = require("../models/Hotel");
const Booking = require("../models/Booking");
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
const getRoomPrices = (hotel = {}) =>
    Array.isArray(hotel.roomTypes)
        ? hotel.roomTypes
            .map((room) => Number(room?.pricePerNight))
            .filter((price) => Number.isFinite(price) && price >= 0)
        : [];
const parseDateValue = (value = "") => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};
const getActiveBookedRoomCount = (booking = {}) => {
    const rooms = Array.isArray(booking.hotel?.rooms) ? booking.hotel.rooms : [];
    if (rooms.length > 0) {
        const activeRooms = rooms.filter((room) => !["cancelled", "fully cancelled"].includes(String(room?.status || "").trim().toLowerCase()));
        return activeRooms.length;
    }

    return ["cancelled", "fully cancelled"].includes(String(booking.status || "").trim().toLowerCase()) ? 0 : 1;
};

// Get all hotels (for users)
router.get("/", async (req, res) => {
    try {
        const { city, category, minPrice, maxPrice, rating, checkIn, checkOut } = req.query;
        
        let filter = { isActive: true };
        const cityValue = String(city || "").trim();
        
        if (cityValue) filter["location.city"] = toCiRegex(cityValue);
        if (category) filter.category = category;
        if (rating) filter.rating = { $gte: parseFloat(rating) };
        
        let hotels = await Hotel.find(filter);

        const checkInDate = parseDateValue(checkIn);
        const checkOutDate = parseDateValue(checkOut);
        if (checkInDate && checkOutDate && checkOutDate > checkInDate && hotels.length > 0) {
            const hotelIds = hotels.map((hotel) => hotel._id);
            const overlappingBookings = await Booking.find({
                category: "hotel",
                hotelId: { $in: hotelIds },
                status: { $nin: ["Cancelled", "Fully Cancelled"] },
                "hotel.checkIn": { $lt: checkOutDate },
                "hotel.checkOut": { $gt: checkInDate }
            }).select("hotelId hotel.rooms status").lean();

            const bookedRoomCountByHotel = new Map();
            overlappingBookings.forEach((booking) => {
                const hotelIdKey = String(booking.hotelId || "");
                if (!hotelIdKey) return;

                bookedRoomCountByHotel.set(
                    hotelIdKey,
                    (bookedRoomCountByHotel.get(hotelIdKey) || 0) + getActiveBookedRoomCount(booking)
                );
            });

            hotels = hotels.filter((hotel) => {
                const bookedRooms = bookedRoomCountByHotel.get(String(hotel._id)) || 0;
                return Math.max(Number(hotel.availableRooms || 0) - bookedRooms, 0) > 0;
            });
        }
        
        // Filter by price range
        if (minPrice || maxPrice) {
            hotels = hotels.filter(hotel => {
                const prices = getRoomPrices(hotel);
                if (prices.length === 0) return false;
                const minRoomPrice = Math.min(...prices);
                const maxRoomPrice = Math.max(...prices);
                
                if (minPrice && maxPrice) {
                    return minRoomPrice >= parseFloat(minPrice) && maxRoomPrice <= parseFloat(maxPrice);
                } else if (minPrice) {
                    return minRoomPrice >= parseFloat(minPrice);
                } else if (maxPrice) {
                    return maxRoomPrice <= parseFloat(maxPrice);
                }
                return true;
            });
        }
        
        res.json(hotels);
    } catch (error) {
        res.status(500).json({ message: "Error fetching hotels" });
    }
});

// Get all cities where hotels are available
router.get("/cities/list", async (req, res) => {
    try {
        const cities = await Hotel.distinct("location.city", { isActive: true });
        res.json(cities.sort());
    } catch (error) {
        res.status(500).json({ message: "Error fetching cities" });
    }
});

// Get hotel by ID
router.get("/:id", async (req, res) => {
    try {
        const hotel = await Hotel.findById(req.params.id);
        if (!hotel) {
            return res.status(404).json({ message: "Hotel not found" });
        }
        res.json(hotel);
    } catch (error) {
        res.status(500).json({ message: "Error fetching hotel" });
    }
});

module.exports = router;
