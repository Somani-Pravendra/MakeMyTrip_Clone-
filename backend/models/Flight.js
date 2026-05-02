const mongoose = require("mongoose");

const FlightSchema = new mongoose.Schema({
    airline: { type: String, required: true }, // Keeping for backward compatibility
    airlineName: { type: String }, // User requested
    flightNumber: { type: String, required: true },
    flightType: { type: String, enum: ["Domestic", "International"], default: "Domestic" }, // User requested
    logo: { type: String, required: true },
    from: { type: String, required: true }, // Keeping for backward compatibility
    to: { type: String, required: true }, // Keeping for backward compatibility
    departureCity: { type: String }, // User requested
    arrivalCity: { type: String }, // User requested
    date: { type: String, required: true },
    departureTime: { type: String, required: true },
    arrivalTime: { type: String, required: true },
    duration: { type: String, required: true },
    stops: { type: String, enum: ["Non Stop", "1 Stop", "2+ Stops", "Stop", "Non-stop", "0"], default: "Non Stop" },
    basePrice: { type: Number, required: true }, // Keeping for backward compatibility
    totalFare: { type: Number }, // User requested
    currency: { type: String, default: "INR" }, // User requested
    passportRequired: { type: Boolean, default: false }, // User requested
    visaRequired: { type: Boolean, default: false }, // User requested
    availableSeats: { type: Number, default: 60 }, // User requested
    fares: [
        {
            type: { type: String, required: true },
            price: { type: Number, default: 0 },
            benefits: [{ type: String }]
        }
    ],
    occupiedSeats: { type: [String], default: [] }
}, { timestamps: true });

FlightSchema.index({ from: 1, to: 1, date: 1 });
FlightSchema.index({ flightNumber: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Flight", FlightSchema);
