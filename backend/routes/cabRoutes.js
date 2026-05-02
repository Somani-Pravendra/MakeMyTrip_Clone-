const express = require('express');
const router = express.Router();
const cabController = require('../controllers/cabController');
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');
const upload = require('../middleware/uploadMiddleware');
const Booking = require('../models/Booking');

// Cab Type Routes (Public and Admin)
router.get('/types', cabController.getAllCabTypes);
router.get('/types/:id', cabController.getCabTypeById);
router.post('/types', auth, admin, cabController.createCabType);
router.put('/types/:id', auth, admin, cabController.updateCabType);
router.delete('/types/:id', auth, admin, cabController.deleteCabType);

// Bulk Upload Routes
router.post('/types/preview', auth, admin, upload.single('file'), cabController.previewCabTypes);
router.post('/types/upload', auth, admin, cabController.uploadCabTypes);

// Fare Calculation (Public)
router.post('/calculate-fare', cabController.calculateFare);

// Cab Booking Routes (User)
router.post('/bookings', auth, cabController.createCabBooking);
router.get('/bookings', auth, cabController.getUserCabBookings);
router.get('/bookings/:id', auth, cabController.getCabBookingById);
router.put('/bookings/:id/status', auth, admin, cabController.updateCabBookingStatus);
router.put('/bookings/:id/cancel', auth, cabController.cancelCabBooking);

// Admin Booking Management
router.get('/admin/bookings', auth, admin, async (req, res) => {
  try {
    const { status } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const query = { category: { $in: ['cab', 'cabs'] } };
    
    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate('cabId', 'cabTypeName numberOfSeats baseFare pricePerKm')
      .populate('userId', 'name email mobile')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await Booking.countDocuments(query);

    res.json({
      success: true,
      data: bookings,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      },
      message: 'Cab bookings retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching cab bookings'
    });
  }
});

module.exports = router;
