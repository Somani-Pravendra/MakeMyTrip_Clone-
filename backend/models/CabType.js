const mongoose = require('mongoose');

const cabTypeSchema = new mongoose.Schema({
  cabTypeName: {
    type: String,
    required: true,
    trim: true
  },
  numberOfSeats: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  baseFare: {
    type: Number,
    required: true,
    min: 0
  },
  pricePerKm: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  description: {
    type: String,
    trim: true
  },
  image: {
    type: String,
    default: ''
  },
  date: {
    type: String,
    default: () => new Date().toISOString().split('T')[0]
  },
  features: [{
    type: String,
    trim: true
  }],
  fuelType: {
    type: String,
    enum: ['cng', 'diesel', 'petrol', 'ev'],
  },
  bodyType: {
    type: String,
    enum: ['suv', 'sedan', 'hatchback', 'muv', 'luxury'],
  },
  availableCities: [{
    type: String,
    trim: true,
    lowercase: true
  }]
}, {
  timestamps: true
});

// Index for faster queries
cabTypeSchema.index({ status: 1 });
cabTypeSchema.index({ cabTypeName: 1 });

module.exports = mongoose.model('CabType', cabTypeSchema);
