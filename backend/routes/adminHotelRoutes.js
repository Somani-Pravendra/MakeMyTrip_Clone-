const express = require("express");
const router = express.Router();
const {
    getAllHotels,
    createHotel,
    updateHotel,
    deleteHotel,
    previewHotels,
    uploadHotels
} = require("../controllers/hotelController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const upload = require("../middleware/uploadMiddleware");

// PROTECT ALL ROUTES
router.use(authMiddleware, adminMiddleware);

// Get all hotels (admin only)
router.get("/", getAllHotels);

// Create new hotel (admin only)
router.post("/", createHotel);

// Update hotel (admin only)
router.put("/:id", updateHotel);

// Delete hotel (admin only)
router.delete("/:id", deleteHotel);

// @route   POST /api/admin/hotels/preview
router.post('/preview', upload.single('file'), previewHotels);

// @route   POST /api/admin/hotels/upload
router.post('/upload', uploadHotels);

// Get hotel by ID (admin only)
router.get("/:id", async (req, res) => {
    try {
        const Hotel = require("../models/Hotel");
        const hotel = await Hotel.findById(req.params.id);
        if (!hotel) return res.status(404).json({ message: "Hotel not found" });
        res.json(hotel);
    } catch (err) {
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;
