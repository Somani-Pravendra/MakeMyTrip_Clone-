const Hotel = require("../models/Hotel");
const mongoose = require("mongoose");
const fs = require('fs');
const csv = require('csv-parser');

const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const toCiRegex = (value = "") => new RegExp(escapeRegex(String(value).trim()), "i");
const parseIntField = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
};
const parseFloatField = (value, fallback) => {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? fallback : parsed;
};

// @desc    Get all hotels
// @route   GET /api/admin/hotels
exports.getAllHotels = async (req, res) => {
    try {
        const { city } = req.query;
        let query = {};
        const cityValue = String(city || "").trim();
        
        if (cityValue) query['location.city'] = toCiRegex(cityValue);

        const hotels = await Hotel.find(query).sort({ rating: -1 });
        res.json(hotels);
    } catch (err) {
        res.status(500).json({ message: "Server Error", error: err.message });
    }
};

// @desc    Create a new hotel
// @route   POST /api/admin/hotels
exports.createHotel = async (req, res) => {
    try {
        const newHotel = new Hotel(req.body);
        const hotel = await newHotel.save();
        res.status(201).json(hotel);
    } catch (err) {
        res.status(400).json({ message: "Error creating hotel", error: err.message });
    }
};

// @desc    Update a hotel
// @route   PUT /api/admin/hotels/:id
exports.updateHotel = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid hotel ID" });
        }

        const hotel = await Hotel.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!hotel) return res.status(404).json({ message: "Hotel not found" });
        res.json(hotel);
    } catch (err) {
        res.status(400).json({ message: "Error updating hotel", error: err.message });
    }
};

// @desc    Delete a hotel
// @route   DELETE /api/admin/hotels/:id
exports.deleteHotel = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid hotel ID" });
        }

        const hotel = await Hotel.findByIdAndDelete(req.params.id);
        if (!hotel) return res.status(404).json({ message: "Hotel not found" });
        res.json({ message: "Hotel deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Server Error", error: err.message });
    }
};

// @desc    Preview hotel data before upload (check duplicates)
// @route   POST /api/admin/hotels/preview
exports.previewHotels = async (req, res) => {
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

        let hotelsData = [];

        if (fileExtension === 'csv') {
            hotelsData = await parseCSVFile(file.path);
        } else {
            hotelsData = await parseJSONFile(file.path);
        }

        // Clean up uploaded file
        fs.unlinkSync(file.path);

        if (hotelsData.length === 0) {
            return res.status(400).json({ message: "No valid hotel data found in file" });
        }

        // Check for duplicates and validate
        const results = await validateHotelData(hotelsData);
        
        res.status(200).json({
            message: "File preview processed successfully",
            totalRecords: hotelsData.length,
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
        res.status(500).json({ message: "Server Error", error: err.message });
    }
};

// @desc    Upload hotels from CSV or JSON file (confirmed upload)
// @route   POST /api/admin/hotels/upload
exports.uploadHotels = async (req, res) => {
    try {
        const { hotelsToUpload } = req.body;
        
        if (!hotelsToUpload || !Array.isArray(hotelsToUpload)) {
            return res.status(400).json({ message: "No hotel data provided for upload" });
        }

        let errors = [];
        const results = await processHotelData(hotelsToUpload, errors);
        
        res.status(200).json({
            message: "Hotel data uploaded successfully",
            totalRecords: hotelsToUpload.length,
            successful: results.successful,
            failed: results.failed,
            errors: errors
        });

    } catch (err) {
        res.status(500).json({ message: "Server Error", error: err.message });
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
        } else if (data.hotels && Array.isArray(data.hotels)) {
            return data.hotels;
        } else {
            return [data];
        }
    } catch (error) {
        throw new Error("Invalid JSON format");
    }
};

const normalizeHotelData = (hotelData = {}) => ({
    name: hotelData.name || hotelData.hotelName || hotelData.hotel_name || hotelData.title || "",
    category: hotelData.category || hotelData.hotelCategory || hotelData.hotel_category || "Hotel",
    date: hotelData.date || new Date().toISOString().split('T')[0],
    location: {
        city: hotelData.city || hotelData.location?.city || hotelData.locationCity || hotelData.location_city || "",
        address:
            hotelData.address ||
            hotelData.location?.address ||
            hotelData.hotelAddress ||
            hotelData.hotel_address ||
            hotelData.streetAddress ||
            hotelData.street_address ||
            hotelData.addressLine1 ||
            hotelData.address_line1 ||
            hotelData.fullAddress ||
            hotelData.full_address ||
            "",
        state: hotelData.state || hotelData.location?.state || hotelData.locationState || hotelData.location_state || "",
        pincode: hotelData.pincode || hotelData.pinCode || hotelData.pin_code || hotelData.location?.pincode || ""
    },
    description:
        hotelData.description ||
        hotelData.hotelDescription ||
        hotelData.hotel_description ||
        hotelData.about ||
        hotelData.summary ||
        hotelData.hotelSummary ||
        hotelData.hotel_summary ||
        hotelData.details ||
        "",
    rating: parseFloatField(hotelData.rating, 3),
    stars: parseIntField(hotelData.stars, 3),
    images:
        hotelData.images
            ? (Array.isArray(hotelData.images) ? hotelData.images : hotelData.images.split(','))
            : hotelData.imageUrls
                ? (Array.isArray(hotelData.imageUrls) ? hotelData.imageUrls : hotelData.imageUrls.split(','))
                : hotelData.galleryImages
                    ? (Array.isArray(hotelData.galleryImages) ? hotelData.galleryImages : hotelData.galleryImages.split(','))
                    : [],
    roomTypes: hotelData.roomTypes || [
        { type: "Single", pricePerNight: 1000, maxOccupancy: 1, amenities: ["Wi-Fi", "AC"] },
        { type: "Double", pricePerNight: 1500, maxOccupancy: 2, amenities: ["Wi-Fi", "AC", "TV"] }
    ],
    totalRooms: parseIntField(hotelData.totalRooms ?? hotelData.total_rooms, 50),
    availableRooms: parseIntField(hotelData.availableRooms ?? hotelData.available_rooms, 50),
    amenities: hotelData.amenities ? (Array.isArray(hotelData.amenities) ? hotelData.amenities : hotelData.amenities.split(',')) : ["Wi-Fi", "AC"],
    checkInTime: hotelData.checkInTime || hotelData.check_in_time || "12:00",
    checkOutTime: hotelData.checkOutTime || hotelData.check_out_time || "11:00",
    bookingStatus: hotelData.bookingStatus || hotelData.status || "Available",
    contactInfo: {
        phone: hotelData.phone || hotelData.contactInfo?.phone || "",
        email: hotelData.email || hotelData.contactInfo?.email || "",
        website: hotelData.website || hotelData.contactInfo?.website || ""
    },
    policies: {
        cancellationPolicy: hotelData.cancellationPolicy || hotelData.policies?.cancellationPolicy || "Free cancellation 24h before check-in",
        paymentPolicy: hotelData.paymentPolicy || hotelData.policies?.paymentPolicy || "Pay at check-in",
        checkInInstructions: hotelData.checkInInstructions || hotelData.policies?.checkInInstructions || "Valid ID required"
    },
    isActive: hotelData.isActive !== false
});

// Helper function to validate hotel data (check duplicates and required fields)
const validateHotelData = async (hotelsData) => {
    const valid = [];
    const duplicates = [];
    const invalid = [];

    // Get all existing hotel names
    const existingHotels = await Hotel.find({}, { name: 1 });
    const existingHotelNames = new Set(existingHotels.map(h => h.name));

    for (let i = 0; i < hotelsData.length; i++) {
        const hotelData = hotelsData[i];
        const cleanedHotelData = normalizeHotelData(hotelData);

        // Check for missing required fields
        const requiredFields = ['name', 'location.city', 'location.address', 'description'];
        const missingFields = requiredFields.filter(field => {
            const keys = field.split('.');
            let value = cleanedHotelData;
            for (const key of keys) {
                value = value?.[key];
            }
            return !value || value === "";
        });
        
        if (missingFields.length > 0) {
            invalid.push({
                index: i + 1,
                data: hotelData,
                reason: `Missing required fields: ${missingFields.join(', ')}`
            });
            continue;
        }

        // Check for duplicate hotel name
        if (existingHotelNames.has(cleanedHotelData.name)) {
            duplicates.push({
                index: i + 1,
                data: hotelData,
                hotelName: cleanedHotelData.name,
                reason: "Hotel name already exists"
            });
            continue;
        }

        valid.push(cleanedHotelData);
    }

    return { valid, duplicates, invalid };
};

// Helper function to process hotel data
const processHotelData = async (hotelsData, errors) => {
    const successful = [];
    const failed = [];

    for (let i = 0; i < hotelsData.length; i++) {
        const hotelData = hotelsData[i];
        
        try {
            const cleanedHotelData = normalizeHotelData(hotelData);

            const newHotel = new Hotel(cleanedHotelData);
            const savedHotel = await newHotel.save();
            successful.push(savedHotel);

        } catch (error) {
            errors.push(`Row ${i + 1}: ${error.message}`);
            failed.push(hotelData);
        }
    }

    return { successful, failed };
};
