const express = require('express');
const router = express.Router();
const {
    getAllTrains,
    createTrain,
    updateTrain,
    deleteTrain,
    previewTrains,
    uploadTrains
} = require('../controllers/trainController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const upload = require('../middleware/uploadMiddleware');

// PROTECT ALL ADMIN ROUTES
router.use(authMiddleware, adminMiddleware);

// @route   GET /api/admin/trains
// @desc    Get all trains
router.get('/', getAllTrains);

// @route   POST /api/admin/trains
// @desc    Create a new train
router.post('/', createTrain);

// @route   PUT /api/admin/trains/:id
// @desc    Update a train
router.put('/:id', updateTrain);

// @route   DELETE /api/admin/trains/:id
// @desc    Delete a train
router.delete('/:id', deleteTrain);

// @route   POST /api/admin/trains/preview
router.post('/preview', upload.single('file'), previewTrains);

// @route   POST /api/admin/trains/upload
router.post('/upload', uploadTrains);

module.exports = router;
