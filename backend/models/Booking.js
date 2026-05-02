const mongoose = require("mongoose");

const normalizeBookingCategory = (value) => {
    const category = String(value || "").trim().toLowerCase();
    const aliases = {
        flights: "flight",
        flight: "flight",
        hotels: "hotel",
        hotel: "hotel",
        trains: "train",
        train: "train",
        buses: "bus",
        bus: "bus",
        packages: "package",
        package: "package",
        cab: "cabs",
        cabs: "cabs"
    };

    return aliases[category] || category;
};

const normalizeDateValue = (value) => {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? undefined : value;
    }

    if (typeof value === "string") {
        const trimmed = value.trim();

        // Ignore plain time strings like "09:15" or "09:15:00".
        if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
            return undefined;
        }

        const parsed = new Date(trimmed);
        return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    }

    if (typeof value === "number") {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    }

    return undefined;
};

const bookingSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        category: {
            type: String,
            required: true,
            enum: ['flight', 'hotel', 'train', 'bus', 'package', 'cabs'],
            set: normalizeBookingCategory
        },
        flight: {
            airline: String,
            flightNumber: String,
            from: String,
            to: String,
            departureTime: String,
            arrivalTime: String,
            duration: String,
            stops: String,
            logo: String,
        },
        flightId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Flight',
            required: false // Optional for non-flight bookings
        },
        train: {
            trainName: String,
            trainNumber: String,
            from: String,
            to: String,
            departureTime: String,
            arrivalTime: String,
            duration: String,
            selectedClass: String
        },
        trainId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Train',
            required: false
        },
        pnr: String, // Added for train bookings
        package: {
            title: String,
            packageCode: String,
            destination: {
                country: String,
                state: String,
                cities: [String]
            },
            duration: {
                nights: Number,
                days: Number
            },
            media: {
                bannerImage: String
            }
        },
        packageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Package',
            required: false
        },
        cabId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'CabType',
            required: false
        },
        cab: {
            cabType: String,
            seats: Number,
            baseFare: Number,
            perKmRate: Number,
            pickupLocation: String,
            pickupLatitude: Number,
            pickupLongitude: Number,
            dropLocation: String,
            dropLatitude: Number,
            dropLongitude: Number,
            pickupDateTime: {
                type: Date,
                set: normalizeDateValue
            },
            distance: Number,
            duration: Number,
            specialRequirements: String,
            driverId: String,
            driverName: String,
            driverPhone: String,
            vehicleNumber: String,
            otp: String
        },
        hotel: {
            name: String,
            location: {
                city: String,
                address: String,
                state: String
            },
            stars: Number,
            checkIn: {
                type: Date,
                set: normalizeDateValue
            },
            checkOut: {
                type: Date,
                set: normalizeDateValue
            },
            guests: Number,
            roomType: String,
            // Links this booking to the Hotel.reservations entry for atomic cancellation cleanup.
            reservationId: String,
            rooms: [
                {
                    roomId: String,
                    roomType: String,
                    guests: Number,
                    nights: Number,
                    roomFare: {
                        type: Number,
                        default: 0
                    },
                    status: {
                        type: String,
                        default: "Active"
                    },
                    refundAmount: {
                        type: Number,
                        default: 0
                    },
                    cancellationDate: Date
                }
            ]
        },
        hotelId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hotel',
            required: false
        },
        bus: {
            operatorName: String,
            busType: String,
            from: String,
            to: String,
            departureTime: String,
            arrivalTime: String,
            duration: String,
            seatLayout: String,
            boardingPoint: String,
            droppingPoint: String
        },
        busId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Bus',
            required: false
        },
        // Root-level fields for convenience
        from: String,
        to: String,
        passengers: [
            {
                passengerId: String,
                firstName: String,
                lastName: String,
                age: Number,
                gender: String,
                status: {
                    type: String,
                    default: "Active"
                },
                fareShare: {
                    type: Number,
                    default: 0
                },
                refundAmount: {
                    type: Number,
                    default: 0
                },
                cancellationDate: Date
            },
        ],
        contactDetails: {
            name: String,
            email: String,
            phone: String,
        },
        selectedSeats: [
            {
                id: String,
                price: Number,
            },
        ],
        selectedBerths: [String],
        preferences: mongoose.Schema.Types.Mixed,
        experienceAddOns: mongoose.Schema.Types.Mixed,
        addOns: {
            meals: [
                {
                    id: String,
                    name: String,
                    price: Number,
                },
            ],
            baggage: [
                {
                    id: String,
                    name: String,
                    price: Number,
                },
            ],
            insurance: {
                type: Boolean,
                default: false,
            },
        },
        couponCode: {
            type: String,
            trim: true,
            uppercase: true,
            default: ""
        },
        couponDiscount: {
            type: Number,
            default: 0
        },
        subtotalFare: {
            type: Number,
            default: 0
        },
        totalFare: {
            type: Number,
            required: true,
        },
        payment: {
            method: {
                type: String,
                default: "upi"
            },
            provider: String,
            subMethod: String,
            walletAmountUsed: {
                type: Number,
                default: 0
            },
            externalAmountPaid: {
                type: Number,
                default: 0
            },
            externalPaymentMethod: String,
            externalPaymentOption: String
        },
        status: {
            type: String,
            default: "Confirmed", // Confirmed, Cancelled, Completed
        },
        refundAmount: {
            type: Number,
            default: 0,
        },
        partialCancellations: [
            {
                type: {
                    type: String,
                    enum: ["passenger", "room"]
                },
                itemIds: [String],
                itemNames: [String],
                cancelledBaseAmount: {
                    type: Number,
                    default: 0
                },
                refundAmount: {
                    type: Number,
                    default: 0
                },
                refundPercentage: {
                    type: Number,
                    default: 0
                },
                cancelledAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ],
        cancellationLock: {
            owner: {
                type: String
            },
            type: {
                type: String
            },
            startedAt: {
                type: Date
            },
            expiresAt: {
                type: Date
            }
        },
        cancellationDate: {
            type: Date,
        },
        travelDate: {
            type: Date,
            set: normalizeDateValue,
            required: false // Populated based on category
        },
        bookingDate: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

// ── Indexes for common query patterns ─────────────────────────
bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ category: 1, status: 1 });
bookingSchema.index({ status: 1, createdAt: -1 });
bookingSchema.index({ pnr: 1 }, { sparse: true });
// ──────────────────────────────────────────────────────────────

bookingSchema.pre("validate", function() {
    this.category = normalizeBookingCategory(this.category);

    const inferredTravelDate = normalizeDateValue(
        this.travelDate ||
        this.cab?.pickupDateTime ||
        this.hotel?.checkIn ||
        this.hotel?.checkOut
    );

    if (inferredTravelDate) {
        this.travelDate = inferredTravelDate;
    } else {
        this.travelDate = undefined;
    }
});

module.exports = mongoose.model("Booking", bookingSchema);
