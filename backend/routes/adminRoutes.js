const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const { getDashboardData, getAllBookings, getAllUsers, deleteUser, deleteBooking, updateBookingStatus } = require("../controllers/adminController");

// PROTECT ALL ROUTES
router.use(authMiddleware, adminMiddleware);

// @route   GET /api/admin
// @desc    Get admin dashboard data
router.get("/", getDashboardData);

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard summary
router.get("/dashboard", getDashboardData);

// @route   GET /api/admin/bookings
// @desc    Get all bookings for admin
router.get("/bookings", getAllBookings);

// @route   DELETE /api/admin/bookings/:bookingId
// @desc    Delete a specific booking
router.delete("/bookings/:bookingId", deleteBooking);

// @route   PUT /api/admin/bookings/:bookingId
// @desc    Update booking status
router.put("/bookings/:bookingId", updateBookingStatus);

// @route   GET /api/admin/users
// @desc    Get all users for admin
router.get("/users", getAllUsers);

// @route   DELETE /api/admin/users/:userId
// @desc    Delete user and all their bookings
router.delete("/users/:userId", deleteUser);

module.exports = router;
