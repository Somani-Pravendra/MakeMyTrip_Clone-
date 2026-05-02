const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const upload = require("../middleware/uploadMiddleware");
const { 
    getAllOffers, 
    createOffer, 
    updateOffer, 
    deleteOffer, 
    toggleOfferStatus,
    previewOffers,
    uploadOffers
} = require("../controllers/adminOfferController");

// Protect all routes
router.use(authMiddleware, adminMiddleware);

// @route   GET /api/admin/offers
// @desc    Get all offers
router.get("/", getAllOffers);

// @route   POST /api/admin/offers
// @desc    Create a new offer
router.post("/", createOffer);

// @route   PUT /api/admin/offers/:id
// @desc    Update an offer
router.put("/:id", updateOffer);

// @route   DELETE /api/admin/offers/:id
// @desc    Delete an offer
router.delete("/:id", deleteOffer);

// @route   PATCH /api/admin/offers/:id/toggle
// @desc    Toggle offer active status
router.patch("/:id/toggle", toggleOfferStatus);

// @route   POST /api/admin/offers/preview
router.post("/preview", upload.single("file"), previewOffers);

// @route   POST /api/admin/offers/upload
router.post("/upload", uploadOffers);

module.exports = router;
