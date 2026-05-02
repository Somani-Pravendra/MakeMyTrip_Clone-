const mongoose = require("mongoose");

const OfferSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    promoCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    discountType: {
        type: String,
        enum: ["percentage", "flat"],
        default: "percentage"
    },
    discountValue: {
        type: Number,
        required: true
    },
    minBookingAmount: {
        type: Number,
        default: 0
    },
    maxDiscount: {
        type: Number,
        default: 0 // 0 means no cap for flat, or actually used for percentage
    },
    validTill: {
        type: Date,
        required: true
    },
    category: {
        type: String,
        enum: ["flights", "hotels", "trains", "bus", "cabs", "packages", "all"],
        default: "all"
    },
    imageUrl: {
        type: String,
        default: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800"
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model("Offer", OfferSchema);
