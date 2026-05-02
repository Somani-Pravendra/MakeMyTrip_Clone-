const mongoose = require("mongoose");

const HotelSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ["Hotel", "Resort", "Guest House", "Villa", "Apartment", "Boutique Hotel"],
        required: true
    },
    location: {
        city: {
            type: String,
            required: true
        },
        address: {
            type: String,
            required: true
        },
        state: String,
        pincode: String
    },
    description: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        default: 3
    },
    stars: {
        type: Number,
        min: 1,
        max: 5,
        default: 3
    },
    images: [{
        type: String,
        required: true
    }],
    roomTypes: [{
        type: {
            type: String,
            enum: ["Single", "Double", "Deluxe", "Suite", "Family", "Executive"],
            required: true
        },
        pricePerNight: {
            type: Number,
            required: true
        },
        maxOccupancy: {
            type: Number,
            default: 2
        },
        amenities: [String]
    }],
    totalRooms: {
        type: Number,
        required: true
    },
    availableRooms: {
        type: Number,
        required: true
    },
    amenities: [{
        type: String,
        enum: ["Wi-Fi", "AC", "Parking", "Restaurant", "Swimming Pool", "Gym", "Spa", "Bar", "Airport Transfer", "Kids Club", "Beach Access", "Business Center", "Room Service", "Laundry", "Pet Friendly"]
    }],
    checkInTime: {
        type: String,
        default: "12:00"
    },
    checkOutTime: {
        type: String,
        default: "11:00"
    },
    bookingStatus: {
        type: String,
        enum: ["Available", "Limited", "Full"],
        default: "Available"
    },
    contactInfo: {
        phone: String,
        email: String,
        website: String
    },
    policies: {
        cancellationPolicy: String,
        paymentPolicy: String,
        checkInInstructions: String
    },
    date: {
        type: String,
        default: () => new Date().toISOString().split('T')[0]
    },
    isActive: {
        type: Boolean,
        default: true
    },
    // Atomic reservation tracking for race condition prevention.
    // Each entry represents an active or cancelled room reservation with date range.
    // Used by reserveInventoryForBooking() to atomically check date overlap and reserve rooms.
    reservations: [{
        bookingId: { type: String, required: true },
        checkIn: { type: Date, required: true },
        checkOut: { type: Date, required: true },
        roomCount: { type: Number, required: true, default: 1 },
        status: { type: String, enum: ["Active", "Cancelled"], default: "Active" }
    }]
}, { timestamps: true });

module.exports = mongoose.model("Hotel", HotelSchema);
