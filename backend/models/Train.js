const mongoose = require('mongoose');

const TrainSchema = new mongoose.Schema({
    trainNumber: {
        type: String,
        required: true
    },
    trainName: {
        type: String,
        required: true
    },
    from: {
        type: String,
        required: true
    },
    to: {
        type: String,
        required: true
    },
    departureTime: {
        type: String,
        required: true
    },
    arrivalTime: {
        type: String,
        required: true
    },
    duration: {
        type: String,
        required: true
    },
    days: {
        type: String,
        default: 'Daily'
    },
    trainType: {
        type: String,
        default: 'Express'
    },
    availableClasses: [{
        type: {
            type: String,
            required: true
        },
        fare: {
            type: Number,
            required: true
        },
        status: {
            type: String,
            default: 'Available'
        },
        color: {
            type: String,
            default: 'green'
        },
        totalSeats: {
            type: Number,
            default: 100
        },
        availableSeats: {
            type: Number,
            default: 100
        }
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    date: {
        type: String
    }
}, {
    timestamps: true
});

TrainSchema.index({ trainNumber: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Train', TrainSchema);
