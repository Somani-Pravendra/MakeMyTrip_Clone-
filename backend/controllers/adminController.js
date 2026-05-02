const User = require("../models/User");
const Booking = require("../models/Booking");
const Feedback = require("../models/Feedback");
const mongoose = require("mongoose");
const {
  buildInventoryReservationForBooking,
  releaseInventoryReservation,
  removePackageEmbeddedBooking,
  removeUserPackageData
} = require("../utils/bookingMaintenance");

const revenueExpression = {
  $ifNull: ["$totalFare", { $ifNull: ["$totalPrice", 0] }]
};

const normalizeBookingStatus = (value = "") => {
  const text = String(value).trim().toLowerCase();
  if (text === "pending") return "Pending";
  if (text === "confirmed") return "Confirmed";
  if (text === "completed") return "Completed";
  if (text === "partially cancelled" || text === "partially canceled") return "Partially Cancelled";
  if (text === "fully cancelled" || text === "fully canceled") return "Fully Cancelled";
  if (text === "cancelled" || text === "canceled") return "Cancelled";
  return "";
};
const isCancellationStatus = (value = "") =>
  ["Cancelled", "Partially Cancelled", "Fully Cancelled"].includes(normalizeBookingStatus(value));

// ── Get all bookings (paginated) ──────────────────────────────
exports.getAllBookings = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const skip  = (page - 1) * limit;

    const [allBookings, total] = await Promise.all([
      Booking.find()
        .sort({ bookingDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "name email mobile")
        .lean(),
      Booking.countDocuments()
    ]);

    res.json({ bookings: allBookings, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Error fetching all bookings:", error);
    res.status(500).json({ message: "Error fetching all bookings" });
  }
};

// ── Delete a booking ──────────────────────────────────────────
exports.deleteBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    if (!bookingId) return res.status(400).json({ message: "Booking ID is required" });
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const inventoryReleaseReservation = buildInventoryReservationForBooking(booking, { activeOnly: true });
    if (inventoryReleaseReservation) {
      await releaseInventoryReservation(inventoryReleaseReservation);
    }

    await Promise.all([
      Feedback.deleteOne({ bookingId }),
      mongoose.Types.ObjectId.isValid(booking.packageId)
        ? removePackageEmbeddedBooking({ packageId: booking.packageId, bookingId: booking._id })
        : Promise.resolve()
    ]);

    await Booking.findByIdAndDelete(bookingId);

    res.json({ message: "Booking deleted successfully" });
  } catch (error) {
    console.error("Error deleting booking:", error);
    res.status(500).json({ message: "Error deleting booking" });
  }
};

// ── Update booking status ─────────────────────────────────────
exports.updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const normalizedStatus = normalizeBookingStatus(req.body?.status);

    if (!bookingId) return res.status(400).json({ message: "Booking ID is required" });
    if (!mongoose.Types.ObjectId.isValid(bookingId)) return res.status(400).json({ message: "Invalid booking ID" });
    if (!normalizedStatus) return res.status(400).json({ message: "A valid booking status is required" });

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const currentStatus = normalizeBookingStatus(booking.status) || booking.status;
    const currentIsCancellation = isCancellationStatus(currentStatus);
    const nextIsCancellation = isCancellationStatus(normalizedStatus);

    if (!currentIsCancellation && nextIsCancellation) {
      return res.status(400).json({
        message: "Use the booking cancellation flow to cancel bookings so refund and wallet records stay consistent."
      });
    }

    if (currentIsCancellation && normalizedStatus !== currentStatus) {
      return res.status(400).json({
        message: "Cancelled bookings cannot be reopened or changed from the admin status updater."
      });
    }

    booking.status = normalizedStatus;
    if (["Cancelled", "Fully Cancelled"].includes(normalizedStatus) && !booking.cancellationDate) {
      booking.cancellationDate = new Date();
    }
    if (!["Cancelled", "Fully Cancelled"].includes(normalizedStatus)) {
      booking.cancellationDate = undefined;
    }
    await booking.save();

    const populatedBooking = await Booking.findById(bookingId)
      .populate("userId", "name email mobile")
      .lean();

    res.json({ message: "Booking status updated successfully", booking: populatedBooking });
  } catch (error) {
    console.error("Error updating booking status:", error);
    res.status(500).json({ message: "Error updating booking status" });
  }
};

// ── Get all users (paginated) ─────────────────────────────────
exports.getAllUsers = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const skip  = (page - 1) * limit;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - 6);
    const monthStart = new Date(todayStart);
    monthStart.setDate(todayStart.getDate() - 29);

    const [allUsers, total, adminCount, newToday, newWeek, newMonth, activeUsersResult] = await Promise.all([
      User.aggregate([
        {
          $lookup: {
            from: "bookings",
            localField: "_id",
            foreignField: "userId",
            as: "userBookings"
          }
        },
        {
          $project: {
            name: 1, email: 1, mobile: 1, createdAt: 1,
            isAdmin: 1, loginType: 1, walletBalance: 1,
            totalBookings: { $size: "$userBookings" },
            totalSpent: {
              $sum: {
                $map: {
                  input: "$userBookings",
                  as: "booking",
                  in: { $ifNull: ["$$booking.totalFare", { $ifNull: ["$$booking.totalPrice", 0] }] }
                }
              }
            }
          }
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit }
      ]),
      User.countDocuments(),
      User.countDocuments({ isAdmin: true }),
      User.countDocuments({ isAdmin: { $ne: true }, createdAt: { $gte: todayStart } }),
      User.countDocuments({ isAdmin: { $ne: true }, createdAt: { $gte: weekStart } }),
      User.countDocuments({ isAdmin: { $ne: true }, createdAt: { $gte: monthStart } }),
      User.aggregate([
        {
          $lookup: {
            from: "bookings",
            localField: "_id",
            foreignField: "userId",
            as: "userBookings"
          }
        },
        {
          $match: {
            isAdmin: { $ne: true },
            "userBookings.0": { $exists: true }
          }
        },
        {
          $count: "count"
        }
      ])
    ]);

    const customerCount = Math.max(total - adminCount, 0);
    const activeUsers = activeUsersResult[0]?.count || 0;

    res.json({
      users: allUsers,
      total,
      page,
      pages: Math.ceil(total / limit),
      summary: {
        totalUsers: total,
        customerCount,
        adminCount,
        activeUsers,
        newToday,
        newWeek,
        newMonth
      }
    });
  } catch (error) {
    console.error("Error fetching all users:", error);
    res.status(500).json({ message: "Error fetching all users" });
  }
};

// ── Delete user + their bookings ──────────────────────────────
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ message: "User ID is required" });
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (String(req.user?._id || "") === String(userId)) {
      return res.status(400).json({ message: "You cannot delete your own admin account" });
    }

    const bookings = await Booking.find({ userId });
    for (const booking of bookings) {
      const inventoryReleaseReservation = buildInventoryReservationForBooking(booking, { activeOnly: true });
      if (inventoryReleaseReservation) {
        await releaseInventoryReservation(inventoryReleaseReservation);
      }

      if (mongoose.Types.ObjectId.isValid(booking.packageId)) {
        await removePackageEmbeddedBooking({ packageId: booking.packageId, bookingId: booking._id });
      }
    }

    await Promise.all([
      Feedback.deleteMany({ userId }),
      Booking.deleteMany({ userId }),
      removeUserPackageData({
        userId,
        bookingIds: bookings.map((booking) => booking._id)
      }),
      User.findByIdAndDelete(userId)
    ]);

    res.json({ message: "User and all associated data deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Error deleting user" });
  }
};

// ── Dashboard summary ─────────────────────────────────────────
exports.getDashboardData = async (req, res) => {
  try {
    const [totalUsers, totalBookings, revenueResult, bookingsByCategory, recentActivities] =
      await Promise.all([
        User.countDocuments(),
        Booking.countDocuments(),
        Booking.aggregate([{ $group: { _id: null, totalRevenue: { $sum: revenueExpression } } }]),
        Booking.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]),
        getRecentActivities()
      ]);

    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    const bookings = { flights: 0, hotels: 0, trains: 0, buses: 0, cabs: 0, packages: 0 };
    bookingsByCategory.forEach(item => {
      const cat = String(item?._id || "").toLowerCase();
      if (cat.includes("flight"))  bookings.flights  += item.count;
      else if (cat.includes("hotel"))   bookings.hotels   += item.count;
      else if (cat.includes("train"))   bookings.trains   += item.count;
      else if (cat.includes("bus"))     bookings.buses    += item.count;
      else if (cat.includes("cab"))     bookings.cabs     += item.count;
      else if (cat.includes("package")) bookings.packages += item.count;
    });

    res.json({ totalUsers, totalBookings, totalRevenue, bookings, recentActivity: recentActivities });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({ message: "Error fetching dashboard data" });
  }
};

// ── Recent activities (single aggregation, no N+1) ────────────
const getRecentActivities = async () => {
  try {
    const [recentUsers, recentBookings] = await Promise.all([
      User.find().sort({ createdAt: -1 }).limit(5).select("name createdAt").lean(),
      Booking.find().sort({ createdAt: -1 }).limit(5)
        .populate("userId", "name").lean()
    ]);

    const activities = [];

    recentUsers.forEach(user => {
      activities.push({
        type: "user",
        message: `New user ${user.name} registered`,
        date: user.createdAt
      });
    });

    recentBookings.forEach(booking => {
      const cat = booking.category || "";
      let message = `${booking.userId?.name || "User"} booked a `;
      if (cat.includes("flight"))       message += `flight from ${booking.flight?.from || booking.from || "?"} to ${booking.flight?.to || booking.to || "?"}`;
      else if (cat === "hotel")         message += `hotel in ${booking.hotel?.location?.city || "?"}`;
      else if (cat === "train")         message += `train from ${booking.train?.from || "?"} to ${booking.train?.to || "?"}`;
      else if (cat === "bus")           message += `bus from ${booking.bus?.from || booking.from || "?"} to ${booking.bus?.to || booking.to || "?"}`;
      else if (cat === "package")       message += `package to ${booking.package?.destination?.country || "?"}`;
      else                              message += `${cat} service`;

      activities.push({
        type: cat === "flights" ? "flight" : cat || "booking",
        message,
        date: booking.createdAt,
        amount: booking.totalFare
      });
    });

    activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    return activities.slice(0, 10);
  } catch (error) {
    console.error("Error fetching recent activities:", error);
    return [];
  }
};
