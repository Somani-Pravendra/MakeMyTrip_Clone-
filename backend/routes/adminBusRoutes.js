const express = require('express');
const router = express.Router();
const {
    getAllBuses,
    getBusById,
    createBus,
    updateBus,
    deleteBus,
    getAllBusesAdmin,
    previewBuses,
    uploadBuses
} = require('../controllers/busController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const upload = require('../middleware/uploadMiddleware');

// PROTECT ALL ADMIN ROUTES
router.use(authMiddleware, adminMiddleware);

// @route   GET /api/admin/buses
// @desc    Get all buses for admin (including inactive)
// @access  Admin
router.get('/', getAllBusesAdmin);

// @route   POST /api/admin/buses
// @desc    Create a new bus
// @access  Admin
router.post('/', createBus);

// @route   GET /api/admin/buses/:id
// @desc    Get single bus by ID
// @access  Admin
router.get('/:id', getBusById);

// @route   PUT /api/admin/buses/:id
// @desc    Update a bus
// @access  Admin
router.put('/:id', updateBus);

// @route   DELETE /api/admin/buses/:id
// @desc    Delete a bus
// @access  Admin
router.delete('/:id', deleteBus);

// @route   POST /api/admin/buses/preview
router.post('/preview', upload.single('file'), previewBuses);

// @route   POST /api/admin/buses/upload
router.post('/upload', uploadBuses);

module.exports = router;
