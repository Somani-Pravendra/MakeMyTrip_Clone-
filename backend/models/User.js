const mongoose = require("mongoose");

const walletTransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    source: {
      type: String,
      enum: ["booking_refund", "partial_booking_refund", "booking_payment", "manual_adjustment"],
      required: true
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking"
    },
    description: {
      type: String,
      trim: true
    },
    balanceAfter: {
      type: Number,
      default: 0
    },
    metadata: {
      category: String,
      paymentMethod: String,
      refundPercentage: Number,
      refundType: String,
      refundedItems: Number,
      walletUsed: Number,
      externalPaid: Number
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      unique: true,
      sparse: true
    },
    mobile: {
      type: String,
      unique: true,
      sparse: true
    },
    password: {
      type: String
    },
    loginType: {
      type: String,
      enum: ["email", "google"],
      default: "email"
    },
    dateOfBirth: {
      type: Date
    },
    gender: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    pincode: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      trim: true,
      default: "India"
    },
    isAdmin: {
      type: Boolean,
      default: false
    },
    googleId: String,
    resetPasswordOTP: String,
    resetPasswordExpires: Date,
    resetPasswordOtpAttempts: {
      type: Number,
      default: 0
    },
    resetPasswordOtpBlockedUntil: Date,
    resetPasswordOtpLastSentAt: Date,
    resetPasswordOtpWindowStartedAt: Date,
    resetPasswordOtpSendCount: {
      type: Number,
      default: 0
    },
    walletBalance: {
      type: Number,
      default: 0
    },
    walletTransactions: {
      type: [walletTransactionSchema],
      default: []
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
