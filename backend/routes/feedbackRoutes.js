const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const {
  submitFeedback,
  getMyFeedback,
  getBookingFeedback,
  getAllFeedback,
  moderateFeedback,
  deleteFeedback
} = require('../controllers/feedbackController');

// User Routes
router.post('/', authMiddleware, submitFeedback);
router.get('/my', authMiddleware, getMyFeedback);
router.get('/booking/:bookingId', authMiddleware, getBookingFeedback);

// Admin Routes
router.get('/admin/all', authMiddleware, adminMiddleware, getAllFeedback);
router.put('/admin/:id/toggle', authMiddleware, adminMiddleware, moderateFeedback);
router.delete('/admin/:id', authMiddleware, adminMiddleware, deleteFeedback);

module.exports = router;
