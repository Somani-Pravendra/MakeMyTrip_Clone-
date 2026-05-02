const mongoose = require("mongoose");

const BusSchema = new mongoose.Schema({
    operatorName: { 
        type: String, 
        required: true,
        trim: true
    },
    busType: { 
        type: String, 
        required: true,
        enum: ["AC Sleeper", "Non-AC Sleeper", "AC Semi Sleeper", "Non-AC Semi Sleeper", "AC Seater", "Non-AC Seater", "Volvo AC", "Bharat Benz AC", "Scania AC"]
    },
    seatLayout: { 
        type: String, 
        required: true,
        enum: ["2+1", "2+2", "1+1", "1+2"]
    },
    from: { 
        type: String, 
        required: true,
        trim: true
    },
    to: { 
        type: String, 
        required: true,
        trim: true
    },
    departureTime: { 
        type: String, 
        required: true,
        validate: {
            validator: function(v) {
                return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
            },
            message: props => `${props.value} is not a valid time format (HH:MM)`
        }
    },
    arrivalTime: { 
        type: String, 
        required: true,
        validate: {
            validator: function(v) {
                return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
            },
            message: props => `${props.value} is not a valid time format (HH:MM)`
        }
    },
    duration: { 
        type: String, 
        required: true
    },
    price: { 
        type: Number, 
        required: true,
        min: 0
    },
    totalSeats: { 
        type: Number, 
        required: true,
        min: 1,
        max: 60
    },
    availableSeats: { 
        type: Number, 
        required: true,
        min: 0,
        max: 60
    },
    occupiedSeats: [{
        type: String,
        trim: true,
        uppercase: true
    }],
    rating: { 
        type: Number, 
        default: 4.0,
        min: 0,
        max: 5
    },
    amenities: [{
        type: String,
        enum: ["WiFi", "Water", "Blanket", "Charging", "Snacks", "Wait Lounge", "Pillow", "TV", "Emergency Exit", "Reading Light", "Air Conditioning"]
    }],
    status: { 
        type: String, 
        default: "Active",
        enum: ["Active", "Inactive"]
    },
    date: { 
        type: String, 
        required: true
    }
}, { 
    timestamps: true 
});

// Index for search performance
BusSchema.index({ from: 1, to: 1, date: 1 });
BusSchema.index({ operatorName: 1 });

// Virtual for checking if seats are available
BusSchema.virtual('hasSeats').get(function() {
    return this.availableSeats > 0;
});

module.exports = mongoose.model("Bus", BusSchema);
