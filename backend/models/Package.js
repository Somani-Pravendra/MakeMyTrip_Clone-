const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema({
    packageId: { type: String, required: true, unique: true },
    packageTitle: { type: String, required: true },
    destination: { type: String, required: true },
    country: { type: String, required: true },
    city: { type: String, required: true },
    duration: { type: String, required: true }, // e.g., "5N/6D"
    category: { type: String, required: true }, // e.g., "Holiday", "Honeymoon"

    // Pricing
    pricePerPerson: { type: Number, required: true },
    originalPrice: { type: Number },
    discount: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },

    // Details
    startLocation: { type: String, required: true },
    transportType: { type: String }, // e.g., "Flight + Cab"
    hotelType: { type: String }, // e.g., "4 Star"
    mealsIncluded: { type: String }, // e.g., "Breakfast & Dinner"

    // Arrays
    highlights: [{ type: String }],
    itinerary: [{
        day: { type: Number },
        title: { type: String },
        description: { type: String },
        activities: [{ type: String }]
    }],
    included: [{ type: String }],
    excluded: [{ type: String }],

    // Media
    thumbnailImage: { type: String, required: true },
    galleryImages: [{ type: String }],

    // Availability
    date: { type: String, default: () => new Date().toISOString().split('T')[0] },
    availableFrom: { type: Date },
    availableTo: { type: Date },
    seatsAvailable: { type: Number, required: true, default: 10 },

    // Stats
    rating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },

    // Embedded user data
    reviews: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        userName: { type: String },
        rating: { type: Number, min: 1, max: 5 },
        comment: { type: String },
        date: { type: Date, default: Date.now }
    }],
    bookings: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        userName: { type: String },
        bookingId: { type: String },
        travelDate: { type: Date },
        adults: { type: Number },
        children: { type: Number },
        totalAmount: { type: Number },
        paymentStatus: { type: String, enum: ['Pending', 'Completed', 'Failed'], default: 'Pending' },
        status: { type: String, enum: ['Confirmed', 'Cancelled', 'Pending'], default: 'Pending' },
        bookedAt: { type: Date, default: Date.now }
    }],

    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Middleware to update timestamps and stats before saving
packageSchema.pre('save', async function () {
    this.updatedAt = Date.now();

    if (this.reviews && this.reviews.length > 0) {
        const total = this.reviews.reduce((acc, rev) => acc + rev.rating, 0);
        this.rating = Number((total / this.reviews.length).toFixed(1));
        this.totalReviews = this.reviews.length;
    }
});

module.exports = mongoose.model("Package", packageSchema);
