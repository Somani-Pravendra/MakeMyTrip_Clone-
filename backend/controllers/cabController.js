const mongoose = require('mongoose');
const CabType = require('../models/CabType');
const Booking = require('../models/Booking');
const fs = require('fs');
const csv = require('csv-parser');

const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Cab Type Management
exports.getAllCabTypes = async (req, res) => {
  try {
    const { city, fuelType, bodyType } = req.query;
    const query = { status: 'active' };

    if (city) {
      query.availableCities = { $in: [city.trim().toLowerCase()] };
    }
    if (fuelType) {
      query.fuelType = fuelType.toLowerCase();
    }
    if (bodyType) {
      query.bodyType = bodyType.toLowerCase();
    }

    const cabTypes = await CabType.find(query)
      .select('-__v')
      .sort({ cabTypeName: 1 })
      .lean();
    // Explicitly map _id to id just in case for older records that might be serializing weirdly
    const mappedCabTypes = cabTypes.map(cab => {
      return {
        ...cab,
        id: cab._id ? cab._id.toString() : null
      };
    });

    res.json({
      success: true,
      data: mappedCabTypes,
      message: 'Cab types retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching cab types'
    });
  }
};

exports.getCabTypeById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid cab type ID'
      });
    }
    const cabType = await CabType.findById(req.params.id);
    if (!cabType) {
      return res.status(404).json({
        success: false,
        message: 'Cab type not found'
      });
    }
    res.json({
      success: true,
      data: cabType,
      message: 'Cab type retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching cab type'
    });
  }
};

exports.createCabType = async (req, res) => {
  try {
    const cabType = new CabType(req.body);
    await cabType.save();
    res.status(201).json({
      success: true,
      data: cabType,
      message: 'Cab type created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating cab type'
    });
  }
};

exports.updateCabType = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid cab type ID'
      });
    }

    const cabType = await CabType.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!cabType) {
      return res.status(404).json({
        success: false,
        message: 'Cab type not found'
      });
    }
    res.json({
      success: true,
      data: cabType,
      message: 'Cab type updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating cab type'
    });
  }
};

exports.deleteCabType = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid cab type ID'
      });
    }

    const cabType = await CabType.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { new: true }
    );
    if (!cabType) {
      return res.status(404).json({
        success: false,
        message: 'Cab type not found'
      });
    }
    res.json({
      success: true,
      message: 'Cab type deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting cab type'
    });
  }
};

// Cab Booking Management
exports.createCabBooking = async (req, res) => {
  try {
    const {
      cabTypeId,
      pickupLocationName,
      pickupLatitude,
      pickupLongitude,
      dropLocationName,
      dropLatitude,
      dropLongitude,
      distanceInKm,
      estimatedFare,
      pickupDateTime,
      notes
    } = req.body;

    if (!cabTypeId || !mongoose.Types.ObjectId.isValid(cabTypeId)) {
      return res.status(400).json({ success: false, message: 'Invalid cab type ID' });
    }

    const cabType = await CabType.findById(cabTypeId);
    if (!cabType) {
      return res.status(404).json({ success: false, message: 'Cab type not found' });
    }
    if (cabType.status !== 'active') {
      return res.status(400).json({ success: false, message: 'This cab type is not available for booking right now' });
    }

    const calculatedFare = estimatedFare || (cabType.baseFare + (distanceInKm * cabType.pricePerKm));

    const booking = new Booking({
      userId: req.user._id,
      category: 'cabs',
      cabId: new mongoose.Types.ObjectId(cabTypeId),
      cab: {
        cabType: cabType.cabTypeName,
        seats: cabType.numberOfSeats,
        baseFare: cabType.baseFare,
        perKmRate: cabType.pricePerKm,
        pickupLocation: pickupLocationName,
        pickupLatitude,
        pickupLongitude,
        dropLocation: dropLocationName,
        dropLatitude,
        dropLongitude,
        pickupDateTime: new Date(pickupDateTime),
        distance: distanceInKm,
        duration: null,
        specialRequirements: notes || ''
      },
      totalFare: calculatedFare,
      status: 'Confirmed'
    });

    await booking.save();

    try {
      await booking.populate('cabId', 'cabTypeName numberOfSeats baseFare pricePerKm');
    } catch (populateError) {
      console.error('Populate error (non-fatal):', populateError.message);
    }

    res.status(201).json({ success: true, data: booking, message: 'Cab booking created successfully' });
  } catch (error) {
    console.error('Error creating cab booking:', error);
    res.status(400).json({ success: false, message: 'Error creating cab booking' });
  }
};

exports.getUserCabBookings = async (req, res) => {
  try {
    const { status } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const query = { userId: req.user._id, category: 'cabs' };
    
    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate('cabId', 'cabTypeName numberOfSeats baseFare pricePerKm')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await Booking.countDocuments(query);

    res.json({
      success: true,
      data: bookings,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      },
      message: 'Cab bookings retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching cab bookings'
    });
  }
};

exports.getCabBookingById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid cab booking ID'
      });
    }

    const booking = await Booking.findOne({ _id: req.params.id, category: 'cabs' })
      .populate('cabId', 'cabTypeName numberOfSeats baseFare pricePerKm')
      .populate('userId', 'name email mobile');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Cab booking not found'
      });
    }

    // Authorization check: User must be the owner or an admin
    const isOwner = booking.userId._id.toString() === req.user._id.toString();
    if (!isOwner && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this booking'
      });
    }

    res.json({
      success: true,
      data: booking,
      message: 'Cab booking retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching cab booking'
    });
  }
};

exports.updateCabBookingStatus = async (req, res) => {
  try {
    const { bookingStatus, driverId, driverName, driverPhone, vehicleNumber, otp } = req.body;
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid cab booking ID'
      });
    }
    
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, category: 'cabs' },
      {
        $set: {
            status: bookingStatus,
            "cab.driverId": driverId,
            "cab.driverName": driverName,
            "cab.driverPhone": driverPhone,
            "cab.vehicleNumber": vehicleNumber,
            "cab.otp": otp
        }
      },
      { new: true, runValidators: true }
    ).populate('cabId', 'cabTypeName numberOfSeats baseFare pricePerKm');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Cab booking not found'
      });
    }

    res.json({
      success: true,
      data: booking,
      message: 'Cab booking status updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating cab booking status'
    });
  }
};

exports.cancelCabBooking = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid cab booking ID'
      });
    }

    const booking = await Booking.findOne({ _id: req.params.id, category: 'cabs' });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Cab booking not found'
      });
    }

    // Authorization check: User must be the owner or an admin
    const isOwner = booking.userId.toString() === req.user._id.toString();
    if (!isOwner && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to cancel this booking'
      });
    }

    booking.status = 'Cancelled';
    await booking.save();
    
    await booking.populate('cabId', 'cabTypeName numberOfSeats baseFare pricePerKm');

    res.json({
      success: true,
      data: booking,
      message: 'Cab booking cancelled successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error cancelling cab booking'
    });
  }
};

// -------------------- BULK UPLOAD HANDLERS --------------------

// @desc    Preview cab type data before upload (check duplicates)
// @route   POST /api/cabs/preview
exports.previewCabTypes = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const file = req.file;
        const fileExtension = file.originalname.split('.').pop().toLowerCase();
        
        if (fileExtension !== 'csv' && fileExtension !== 'json') {
            fs.unlinkSync(file.path);
            return res.status(400).json({ message: "Only CSV and JSON files are allowed" });
        }

        let cabTypesData = [];

        if (fileExtension === 'csv') {
            cabTypesData = await parseCSVFile(file.path);
        } else {
            cabTypesData = await parseJSONFile(file.path);
        }

        // Clean up uploaded file
        fs.unlinkSync(file.path);

        if (cabTypesData.length === 0) {
            return res.status(400).json({ message: "No valid cab type data found in file" });
        }

        // Check for duplicates and validate
        const results = await validateCabTypeData(cabTypesData);
        
        res.status(200).json({
            message: "File preview processed successfully",
            totalRecords: cabTypesData.length,
            validRecords: results.valid.length,
            duplicateRecords: results.duplicates.length,
            invalidRecords: results.invalid.length,
            duplicates: results.duplicates,
            invalid: results.invalid,
            valid: results.valid
        });

    } catch (err) {
        // Clean up file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ 
            success: false, 
            message: "Server Error during preview", 
            error: err.message || "Unknown server error" 
        });
    }
};

// @desc    Upload cab types from CSV or JSON file (confirmed upload)
// @route   POST /api/cabs/upload
exports.uploadCabTypes = async (req, res) => {
    try {
        const { cabTypesToUpload } = req.body;
        
        if (!cabTypesToUpload || !Array.isArray(cabTypesToUpload)) {
            return res.status(400).json({ 
                success: false,
                message: "Invalid data format", 
                error: "No cab type data provided for upload" 
            });
        }

        let errors = [];
        const results = await processCabTypeData(cabTypesToUpload, errors);
        
        res.status(200).json({
            success: true,
            message: results.failed.length === 0 ? "Cab type data uploaded successfully" : "Upload completed with some errors",
            totalRecords: cabTypesToUpload.length,
            successful: results.successful.length,
            failed: results.failed.length,
            errors: errors
        });

    } catch (err) {
        res.status(500).json({ 
            success: false,
            message: "Server Error during upload", 
            error: err.message || "Unknown server error" 
        });
    }
};

// Helper function to parse CSV file
const parseCSVFile = (filePath) => {
    return new Promise((resolve, reject) => {
        const results = [];
        
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => {
                results.push(data);
            })
            .on('end', () => {
                resolve(results);
            })
            .on('error', (error) => {
                reject(error);
            });
    });
};

// Helper function to parse JSON file
const parseJSONFile = async (filePath) => {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(fileContent);
        
        if (Array.isArray(data)) {
            return data;
        } else if (data.cabTypes && Array.isArray(data.cabTypes)) {
            return data.cabTypes;
        } else {
            return [data];
        }
    } catch (error) {
        throw new Error("Invalid JSON format");
    }
};

// Helper function to validate cab type data (check duplicates and required fields)
const validateCabTypeData = async (cabTypesData) => {
    const valid = [];
    const duplicates = [];
    const invalid = [];

    // Get all existing cab type names
    const existingCabTypes = await CabType.find({}, { cabTypeName: 1 });
    const existingNames = new Set(existingCabTypes.map(c => c.cabTypeName.toLowerCase().trim()));
    const seenNamesInUpload = new Set();

    for (let i = 0; i < cabTypesData.length; i++) {
        const data = cabTypesData[i];
        
        // Clean and map data
        const cleanedData = {
            cabTypeName: data.cabTypeName || data.name || "",
            numberOfSeats: parseInt(data.numberOfSeats) || parseInt(data.seats) || 0,
            baseFare: parseFloat(data.baseFare) || parseFloat(data.base_fare) || 0,
            pricePerKm: parseFloat(data.pricePerKm) || parseFloat(data.price_per_km) || 0,
            date: data.date || new Date().toISOString().split('T')[0],
            status: data.status || "active",
            description: data.description || "",
            features: data.features ? (typeof data.features === 'string' ? data.features.split(',').map(f => f.trim()) : data.features) : []
        };

        // Check for missing required fields
        const requiredFields = ['cabTypeName', 'numberOfSeats', 'baseFare', 'pricePerKm'];
        const missingFields = requiredFields.filter(field => !cleanedData[field]);
        
        if (missingFields.length > 0) {
            invalid.push({
                index: i + 1,
                data: data,
                reason: `Missing required fields: ${missingFields.join(', ')}`
            });
            continue;
        }

        // Check for duplicate name
        const normalizedName = cleanedData.cabTypeName.toLowerCase().trim();

        if (existingNames.has(normalizedName)) {
            duplicates.push({
                index: i + 1,
                data: data,
                cabTypeName: cleanedData.cabTypeName,
                reason: "Cab type name already exists"
            });
            continue;
        }

        if (seenNamesInUpload.has(normalizedName)) {
            duplicates.push({
                index: i + 1,
                data: data,
                cabTypeName: cleanedData.cabTypeName,
                reason: "Duplicate cab type name found in uploaded file"
            });
            continue;
        }

        seenNamesInUpload.add(normalizedName);

        valid.push(cleanedData);
    }

    return { valid, duplicates, invalid };
};

const processCabTypeData = async (cabTypesData, errors) => {
    const successful = [];
    const failed = [];

    for (let i = 0; i < cabTypesData.length; i++) {
        const data = cabTypesData[i];
        
        try {
            if (!data.cabTypeName) {
                errors.push(`Row ${i + 1}: Missing cab type name`);
                failed.push(data);
                continue;
            }

            // Check for duplicate name again to handle race conditions
            const existing = await CabType.findOne({
                cabTypeName: { $regex: new RegExp(`^${escapeRegex(String(data.cabTypeName).trim())}$`, "i") }
            });
            if (existing) {
                errors.push(`Row ${i + 1}: Cab type ${data.cabTypeName} already exists`);
                failed.push(data);
                continue;
            }

            const newCabType = new CabType(data);
            const saved = await newCabType.save();
            successful.push(saved);

        } catch (error) {
            errors.push(`Row ${i + 1}: ${error.message}`);
            failed.push(data);
        }
    }

    return { successful, failed };
};

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);  
  const dLon = deg2rad(lon2 - lon1); 
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c; // Distance in km
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// Calculate fare
exports.calculateFare = async (req, res) => {
  try {
    const { cabTypeId, distanceInKm, pickupLat, pickupLng, dropLat, dropLng } = req.body;

    const cabType = await CabType.findById(cabTypeId);
    if (!cabType) {
      return res.status(404).json({
        success: false,
        message: 'Cab type not found'
      });
    }

    let finalDistance = distanceInKm;
    if (!finalDistance && pickupLat && pickupLng && dropLat && dropLng) {
      finalDistance = getDistanceFromLatLonInKm(parseFloat(pickupLat), parseFloat(pickupLng), parseFloat(dropLat), parseFloat(dropLng));
      finalDistance = Math.round(finalDistance * 100) / 100;
    }

    if (!finalDistance) {
      return res.status(400).json({
        success: false,
        message: 'Distance or pickup/drop coordinates are required'
      });
    }

    const fare = cabType.baseFare + (finalDistance * cabType.pricePerKm);

    res.json({
      success: true,
      data: {
        baseFare: cabType.baseFare,
        pricePerKm: cabType.pricePerKm,
        distanceInKm: finalDistance,
        totalFare: fare,
        cabTypeName: cabType.cabTypeName
      },
      message: 'Fare calculated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error calculating fare'
    });
  }
};
