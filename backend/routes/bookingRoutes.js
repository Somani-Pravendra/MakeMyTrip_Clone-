const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  createBooking,
  getMyBookings,
  resendBookingTicketEmail,
  resendBookingCancellationEmail,
  cancelBooking,
  cancelBookingPartially
} = require("../controllers/bookingController");

// @route   GET /api/bookings/ping
router.get("/ping", (req, res) => res.json({ ok: true }));

// @route   POST /api/bookings
// @desc    Create a new booking history record
router.post("/", authMiddleware, createBooking);

// @route   GET /api/bookings
// @desc    Get booking history for the logged-in user
router.get("/", authMiddleware, getMyBookings);

// @route   POST /api/bookings/:id/send-ticket
// @desc    Resend ticket email for the logged-in user's booking
router.post("/:id/send-ticket", authMiddleware, resendBookingTicketEmail);

// @route   POST /api/bookings/:id/send-cancellation-email
// @desc    Resend cancellation email for the logged-in user's booking
router.post("/:id/send-cancellation-email", authMiddleware, resendBookingCancellationEmail);

// @route   POST /api/bookings/:id/cancel
// @desc    Cancel a booking and calculate refund
router.post("/:id/cancel", authMiddleware, cancelBooking);

// @route   POST /api/bookings/:id/cancel/partial
// @desc    Partial cancellation for selected passengers/rooms
router.post("/:id/cancel/partial", authMiddleware, cancelBookingPartially);

module.exports = router;
