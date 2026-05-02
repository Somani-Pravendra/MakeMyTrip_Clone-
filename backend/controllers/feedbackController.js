const Feedback = require('../models/Feedback');
const Booking = require('../models/Booking');
const mongoose = require("mongoose");

const normalizeFeedbackCategory = (category = '') => {
  const value = String(category).trim().toLowerCase();
  if (value === 'flights' || value === 'flight') return 'flight';
  if (value === 'hotels' || value === 'hotel') return 'hotel';
  if (value === 'trains' || value === 'train') return 'train';
  if (value === 'buses' || value === 'bus') return 'bus';
  if (value === 'cabs' || value === 'cab') return 'cab';
  if (value === 'packages' || value === 'package' || value === 'holiday') return 'package';
  return value;
};

const getFeedbackTitle = (category = '') => {
  const normalized = normalizeFeedbackCategory(category);
  if (normalized === 'flight') return 'Flight booking feedback';
  if (normalized === 'hotel') return 'Hotel booking feedback';
  if (normalized === 'train') return 'Train booking feedback';
  if (normalized === 'bus') return 'Bus booking feedback';
  if (normalized === 'cab') return 'Cab booking feedback';
  if (normalized === 'package') return 'Package booking feedback';
  return 'Booking feedback';
};

/**
 * @desc    Submit feedback for a booking experience
 * @route   POST /api/feedback
 * @access  Private
 */
exports.submitFeedback = async (req, res) => {
  try {
    const {
      bookingId,
      rating,
      message,
      submittedFrom
    } = req.body;

    // 1. Validation
    if (!bookingId || !rating) {
      return res.status(400).json({ success: false, message: "Booking and rating are required" });
    }
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    const numericRating = Number(rating);
    if (Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
    }

    const normalizedSubmittedFrom = ['booking_success', 'profile', 'other'].includes(submittedFrom)
      ? submittedFrom
      : 'other';
    const normalizedMessage = String(message || '').trim();
    const normalizedCategory = normalizeFeedbackCategory(req.body.category || '');

    // 2. Search for booking
    const booking = await Booking.findOne({ _id: bookingId, userId: req.user._id });
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found or unauthorized" });
    }

    // 3. Check for previous feedback
    const existing = await Feedback.findOne({ bookingId, userId: req.user._id });
    if (existing) {
      return res.status(400).json({ success: false, message: "Feedback already submitted for this booking" });
    }

    // 4. Cancelled bookings cannot be reviewed
    const bookingStatus = String(booking.status || '').trim().toLowerCase();
    if (bookingStatus === 'cancelled' || bookingStatus === 'fully cancelled') {
      return res.status(400).json({
        success: false,
        message: "Feedback is not available for cancelled bookings."
      });
    }

    // 5. Save Feedback
    const feedback = new Feedback({
      userId: req.user._id,
      bookingId,
      category: normalizedCategory || normalizeFeedbackCategory(booking.category),
      rating: numericRating,
      processSmooth: numericRating >= 4,
      issueFaced: numericRating <= 2,
      issueDetails: numericRating <= 2 ? normalizedMessage : '',
      focusAreas: [],
      title: getFeedbackTitle(booking.category),
      message: normalizedMessage,
      wouldRecommend: numericRating >= 4,
      submittedFrom: normalizedSubmittedFrom
    });

    await feedback.save();

    res.status(201).json({
      success: true,
      message: "Feedback submitted successfully",
      feedback
    });

  } catch (err) {
    console.error('Feedback submission failed:', err);
    res.status(500).json({ success: false, message: "Server error during feedback submission" });
  }
};

/**
 * @desc    Get current user's feedback history
 * @route   GET /api/feedback/my
 * @access  Private
 */
exports.getMyFeedback = async (req, res) => {
  try {
    const feedbackList = await Feedback.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, feedback: feedbackList });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch your feedback" });
  }
};

/**
 * @desc    Get feedback for a specific booking
 * @route   GET /api/feedback/booking/:bookingId
 * @access  Private
 */
exports.getBookingFeedback = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.bookingId)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    const feedback = await Feedback.findOne({ 
      bookingId: req.params.bookingId, 
      userId: req.user._id 
    });
    
    res.status(200).json({ 
      success: true, 
      exists: !!feedback,
      feedback: feedback || null 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch booking feedback" });
  }
};

/**
 * @desc    Admin: Get all feedback
 * @route   GET /api/admin/feedback
 * @access  Private/Admin
 */
exports.getAllFeedback = async (req, res) => {
  try {
    const { category, rating } = req.query;
    const filter = {};
    if (category && category !== 'all') filter.category = normalizeFeedbackCategory(category);
    if (rating && rating !== 'all') filter.rating = Number(rating);

    const feedbackList = await Feedback.find(filter)
      .populate('userId', 'name email')
      .populate('bookingId')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, feedback: feedbackList });
  } catch (err) {
    res.status(500).json({ success: false, message: "Admin fetch failed" });
  }
};

/**
 * @desc    Admin: Moderate feedback (Hide/Delete)
 * @route   PUT /api/admin/feedback/:id/toggle
 * @access  Private/Admin
 */
exports.moderateFeedback = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid feedback ID" });
    }

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ success: false, message: "Feedback not found" });

    feedback.isVisible = !feedback.isVisible;
    await feedback.save();

    res.status(200).json({ success: true, message: `Feedback marked as ${feedback.isVisible ? 'Visible' : 'Hidden'}`, feedback });
  } catch (err) {
    res.status(500).json({ success: false, message: "Moderation failed" });
  }
};
/**
 * @desc    Admin: Delete feedback
 * @route   DELETE /api/feedback/admin/:id
 * @access  Private/Admin
 */
exports.deleteFeedback = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid feedback ID" });
    }

    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    if (!feedback) {
      return res.status(404).json({ success: false, message: "Feedback not found" });
    }

    res.status(200).json({ success: true, message: "Feedback deleted successfully" });
  } catch (err) {
    console.error('Feedback deletion failed:', err);
    res.status(500).json({ success: false, message: "Server error during feedback deletion" });
  }
};
