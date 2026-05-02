const Bus = require("../models/Bus");
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

const normalizeBusData = (busData = {}) => ({
    operatorName: busData.operatorName || "",
    busType: busData.busType || "AC Seater",
    seatLayout: busData.seatLayout || "2+2",
    from: busData.from || "",
    to: busData.to || "",
    departureTime: busData.departureTime || "",
    arrivalTime: busData.arrivalTime || "",
    duration: busData.duration || "",
    price: parseFloatField(busData.price, 0),
    totalSeats: parseIntField(busData.totalSeats, 40),
    availableSeats: parseIntField(busData.availableSeats, 40),
    rating: parseFloatField(busData.rating, 4.0),
    amenities: busData.amenities
        ? (Array.isArray(busData.amenities) ? busData.amenities : busData.amenities.split(',').map(item => item.trim()).filter(Boolean))
        : ["WiFi", "Water"],
    status: busData.status || "Active",
    date: busData.date || ""
});

const getMissingBusFields = (busData) => {
    const requiredFields = ['operatorName', 'busType', 'from', 'to', 'departureTime', 'arrivalTime', 'duration', 'price', 'totalSeats', 'availableSeats', 'date'];
    return requiredFields.filter((field) => busData[field] === undefined || busData[field] === null || busData[field] === "");
};

// @desc    Get all buses (with optional search filters)
// @route   GET /api/buses
exports.getAllBuses = async (req, res) => {
    try {
        const { from, to, date } = req.query;
        let query = { status: "Active" };
        const fromValue = String(from || "").trim();
        const toValue = String(to || "").trim();
        
        // Apply search filters if provided
        if (fromValue) query.from = toCiRegex(fromValue);
        if (toValue) query.to = toCiRegex(toValue);
        
        // Exact date search first
        let buses = [];
        if (date) {
            buses = await Bus.find({ ...query, date }).sort({ departureTime: 1 });
        }

        // Fallback: If no results for today, show all buses for this route regardless of date
        if (buses.length === 0) {
            buses = await Bus.find(query).sort({ departureTime: 1 });
        }
        
        res.status(200).json({
            success: true,
            count: buses.length,
            data: buses
        });
    } catch (err) {
        console.error("Error fetching buses:", err);
        res.status(500).json({ 
            success: false,
            message: "Server Error", 
            error: err.message 
        });
    }
};

// @desc    Get single bus by ID
// @route   GET /api/buses/:id
exports.getBusById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid bus ID"
            });
        }

        const bus = await Bus.findById(req.params.id);
        
        if (!bus) {
            return res.status(404).json({ 
                success: false,
                message: "Bus not found" 
            });
        }
        
        res.status(200).json({
            success: true,
            data: bus
        });
    } catch (err) {
        console.error("Error fetching bus:", err);
        res.status(500).json({ 
            success: false,
            message: "Server Error", 
            error: err.message 
        });
    }
};

// @desc    Create a new bus (Admin only)
// @route   POST /api/admin/buses
exports.createBus = async (req, res) => {
    try {
        const busData = normalizeBusData(req.body);
        
        // Validate required fields
        const missingFields = getMissingBusFields(busData);
        
        if (missingFields.length > 0) {
            return res.status(400).json({ 
                success: false,
                message: `Missing required fields: ${missingFields.join(', ')}`,
                missingFields 
            });
        }

        // Validate numeric fields
        if (busData.price <= 0) {
            return res.status(400).json({ 
                success: false,
                message: "Price must be greater than 0" 
            });
        }

        if (busData.totalSeats <= 0 || busData.totalSeats > 60) {
            return res.status(400).json({ 
                success: false,
                message: "Total seats must be between 1 and 60" 
            });
        }

        if (busData.availableSeats < 0 || busData.availableSeats > busData.totalSeats) {
            return res.status(400).json({ 
                success: false,
                message: "Available seats must be between 0 and total seats" 
            });
        }

        // Create new bus
        const newBus = new Bus(busData);
        const bus = await newBus.save();
        res.status(201).json({
            success: true,
            message: "Bus created successfully",
            data: bus
        });
    } catch (err) {
        console.error("Error creating bus:", err);
        
        // Handle validation errors
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(e => ({
                field: e.path,
                message: e.message
            }));
            return res.status(400).json({ 
                success: false,
                message: "Validation Error", 
                errors 
            });
        }
        
        res.status(400).json({ 
            success: false,
            message: "Error creating bus", 
            error: err.message 
        });
    }
};

// @desc    Update a bus (Admin only)
// @route   PUT /api/admin/buses/:id
exports.updateBus = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid bus ID"
            });
        }

        const bus = await Bus.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!bus) {
            return res.status(404).json({ 
                success: false,
                message: "Bus not found" 
            });
        }
        
        res.status(200).json({
            success: true,
            message: "Bus updated successfully",
            data: bus
        });
    } catch (err) {
        console.error("Error updating bus:", err);
        
        // Handle validation errors
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ 
                success: false,
                message: "Validation Error", 
                errors 
            });
        }
        
        res.status(400).json({ 
            success: false,
            message: "Error updating bus", 
            error: err.message 
        });
    }
};

// @desc    Delete a bus (Admin only)
// @route   DELETE /api/admin/buses/:id
exports.deleteBus = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid bus ID"
            });
        }

        const bus = await Bus.findByIdAndDelete(req.params.id);
        
        if (!bus) {
            return res.status(404).json({ 
                success: false,
                message: "Bus not found" 
            });
        }
        
        res.status(200).json({
            success: true,
            message: "Bus deleted successfully"
        });
    } catch (err) {
        console.error("Error deleting bus:", err);
        res.status(500).json({ 
            success: false,
            message: "Server Error", 
            error: err.message 
        });
    }
};

// @desc    Get all buses for admin (including inactive)
// @route   GET /api/admin/buses
exports.getAllBusesAdmin = async (req, res) => {
    try {
        const buses = await Bus.find().sort({ createdAt: -1 });
        
        res.status(200).json({
            success: true,
            count: buses.length,
            data: buses
        });
    } catch (err) {
        console.error("Error fetching admin buses:", err);
        res.status(500).json({ 
            success: false,
            message: "Server Error", 
            error: err.message 
        });
    }
};

// @desc    Preview bus data before upload (check duplicates)
// @route   POST /api/admin/buses/preview
exports.previewBuses = async (req, res) => {
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

        let busesData = [];

        if (fileExtension === 'csv') {
            busesData = await parseCSVFile(file.path);
        } else {
            busesData = await parseJSONFile(file.path);
        }

        // Clean up uploaded file
        fs.unlinkSync(file.path);

        if (busesData.length === 0) {
            return res.status(400).json({ message: "No valid bus data found in file" });
        }

        // Check for duplicates and validate
        const results = await validateBusData(busesData);
        
        res.status(200).json({
            message: "File preview processed successfully",
            totalRecords: busesData.length,
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

// @desc    Upload buses from CSV or JSON file (confirmed upload)
// @route   POST /api/admin/buses/upload
exports.uploadBuses = async (req, res) => {
    try {
        const { busesToUpload } = req.body;
        
        if (!busesToUpload || !Array.isArray(busesToUpload)) {
            return res.status(400).json({ message: "No bus data provided for upload" });
        }

        let errors = [];
        const results = await processBusData(busesToUpload, errors);
        
        res.status(200).json({
            message: "Bus data uploaded successfully",
            totalRecords: busesToUpload.length,
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
        } else if (data.buses && Array.isArray(data.buses)) {
            return data.buses;
        } else {
            return [data];
        }
    } catch (error) {
        throw new Error("Invalid JSON format");
    }
};

// Helper function to validate bus data (check duplicates and required fields)
const validateBusData = async (busesData) => {
    const valid = [];
    const duplicates = [];
    const invalid = [];

    for (let i = 0; i < busesData.length; i++) {
        const busData = busesData[i];
        
        const cleanedBusData = normalizeBusData(busData);

        // Check for missing required fields
        const missingFields = getMissingBusFields(cleanedBusData);
        
        if (missingFields.length > 0) {
            invalid.push({
                index: i + 1,
                data: busData,
                reason: `Missing required fields: ${missingFields.join(', ')}`
            });
            continue;
        }

        // Check for duplicate bus (same operator, route, time, and date)
        const existingBus = await Bus.findOne({
            operatorName: cleanedBusData.operatorName,
            from: cleanedBusData.from,
            to: cleanedBusData.to,
            departureTime: cleanedBusData.departureTime,
            date: cleanedBusData.date
        });
        
        if (existingBus) {
            duplicates.push({
                index: i + 1,
                data: busData,
                reason: "Duplicate bus (same operator, route, time, and date)"
            });
            continue;
        }

        valid.push(cleanedBusData);
    }

    return { valid, duplicates, invalid };
};

// Helper function to process bus data
const processBusData = async (busesData, errors) => {
    const successful = [];
    const failed = [];

    for (let i = 0; i < busesData.length; i++) {
        const busData = normalizeBusData(busesData[i]);
        
        try {
            const newBus = new Bus(busData);
            const savedBus = await newBus.save();
            successful.push(savedBus);

        } catch (error) {
            errors.push(`Row ${i + 1}: ${error.message}`);
            failed.push(busData);
        }
    }

    return { successful, failed };
};
