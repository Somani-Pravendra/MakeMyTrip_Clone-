const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    unique: true // One feedback per booking
  },
  category: {
    type: String,
    enum: ['flight', 'hotel', 'train', 'bus', 'cab', 'package'],
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  processSmooth: {
    type: Boolean,
    required: true
  },
  issueFaced: {
    type: Boolean,
    required: true
  },
  issueDetails: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ''
  },
  focusAreas: [{
    type: String,
    trim: true,
    maxlength: 60
  }],
  title: {
    type: String,
    trim: true,
    maxlength: 100,
    default: ''
  },
  message: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ''
  },
  wouldRecommend: {
    type: Boolean,
    default: true
  },
  submittedFrom: {
    type: String,
    enum: ['booking_success', 'profile', 'other'],
    default: 'other'
  },
  isVisible: {
    type: Boolean,
    default: true // For admin to hide inappropriate content
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure unique combination of user and booking
feedbackSchema.index({ userId: 1, bookingId: 1 }, { unique: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
