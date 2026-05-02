const express = require('express');
const router = express.Router();
const {
    getAllFlights,
    createFlight,
    updateFlight,
    deleteFlight,
    previewFlights,
    uploadFlights
} = require('../controllers/flightController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const upload = require('../middleware/uploadMiddleware');

// PROTECT ALL ADMIN ROUTES
router.use(authMiddleware, adminMiddleware);

// @route   GET /api/admin/flights
router.get('/', getAllFlights);

// @route   POST /api/admin/flights
router.post('/', createFlight);

// @route   PUT /api/admin/flights/:id
router.put('/:id', updateFlight);

// @route   DELETE /api/admin/flights/:id
router.delete('/:id', deleteFlight);

// @route   POST /api/admin/flights/preview
router.post('/preview', upload.single('file'), previewFlights);

// @route   POST /api/admin/flights/upload
router.post('/upload', uploadFlights);

module.exports = router;
