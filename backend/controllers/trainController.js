const Train = require('../models/Train');
const mongoose = require("mongoose");
const fs = require('fs');
const csv = require('csv-parser');

const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const toCiRegex = (value = "") => new RegExp(escapeRegex(String(value).trim()), "i");
const toTrainUniqueKey = (trainNumber = "", date = "") => `${String(trainNumber).trim().toUpperCase()}__${String(date).trim()}`;

// @desc    Get all trains
// @route   GET /api/admin/trains
exports.getAllTrains = async (req, res) => {
    try {
        const { from, to, date } = req.query;
        let query = {};
        const fromValue = String(from || "").trim();
        const toValue = String(to || "").trim();
        
        if (fromValue) query.from = toCiRegex(fromValue);
        if (toValue) query.to = toCiRegex(toValue);
        if (date) query.date = date;

        const trains = await Train.find(query).sort({ departureTime: 1 });
        res.json(trains);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a train
// @route   POST /api/admin/trains
exports.createTrain = async (req, res) => {
    try {
        const normalizedTrain = normalizeTrainData(req.body);
        const existingTrain = await Train.findOne({
            trainNumber: normalizedTrain.trainNumber,
            date: normalizedTrain.date
        });

        if (existingTrain) {
            return res.status(400).json({ message: `Train ${normalizedTrain.trainNumber} already exists for ${normalizedTrain.date}` });
        }

        const train = new Train(normalizedTrain);
        const savedTrain = await train.save();
        res.status(201).json(savedTrain);
    } catch (error) {
        res.status(400).json({ message: 'Error creating train' });
    }
};

// @desc    Update a train
// @route   PUT /api/admin/trains/:id
exports.updateTrain = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid train ID" });
        }

        const normalizedTrain = normalizeTrainData(req.body);
        const duplicateTrain = await Train.findOne({
            _id: { $ne: req.params.id },
            trainNumber: normalizedTrain.trainNumber,
            date: normalizedTrain.date
        });

        if (duplicateTrain) {
            return res.status(400).json({ message: `Train ${normalizedTrain.trainNumber} already exists for ${normalizedTrain.date}` });
        }

        const train = await Train.findByIdAndUpdate(
            req.params.id,
            normalizedTrain,
            { new: true, runValidators: true }
        );
        
        if (!train) {
            return res.status(404).json({ message: 'Train not found' });
        }
        
        res.json(train);
    } catch (error) {
        res.status(400).json({ message: 'Error updating train' });
    }
};

// @desc    Delete a train
// @route   DELETE /api/admin/trains/:id
exports.deleteTrain = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid train ID" });
        }

        const train = await Train.findByIdAndDelete(req.params.id);
        
        if (!train) {
            return res.status(404).json({ message: 'Train not found' });
        }
        
        res.json({ message: 'Train deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Preview train data before upload (check duplicates)
// @route   POST /api/admin/trains/preview
exports.previewTrains = async (req, res) => {
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

        let trainsData = [];

        if (fileExtension === 'csv') {
            trainsData = await parseCSVFile(file.path);
        } else {
            trainsData = await parseJSONFile(file.path);
        }

        // Clean up uploaded file
        fs.unlinkSync(file.path);

        if (trainsData.length === 0) {
            return res.status(400).json({ message: "No valid train data found in file" });
        }

        // Check for duplicates and validate
        const results = await validateTrainData(trainsData);
        
        res.status(200).json({
            message: "File preview processed successfully",
            totalRecords: trainsData.length,
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

// @desc    Upload trains from CSV or JSON file (confirmed upload)
// @route   POST /api/admin/trains/upload
exports.uploadTrains = async (req, res) => {
    try {
        const { trainsToUpload } = req.body;
        
        if (!trainsToUpload || !Array.isArray(trainsToUpload)) {
            return res.status(400).json({ message: "No train data provided for upload" });
        }

        let errors = [];
        const results = await processTrainData(trainsToUpload, errors);
        
        res.status(200).json({
            message: "Train data uploaded successfully",
            totalRecords: trainsToUpload.length,
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
        } else if (data.trains && Array.isArray(data.trains)) {
            return data.trains;
        } else {
            return [data];
        }
    } catch (error) {
        throw new Error("Invalid JSON format");
    }
};

const normalizeTrainData = (trainData = {}) => ({
    trainNumber: trainData.trainNumber || trainData.train_number || "",
    trainName: trainData.trainName || trainData.train_name || "",
    from: trainData.from || trainData.source || trainData.fromStation || trainData.from_station || "",
    to: trainData.to || trainData.destination || trainData.toStation || trainData.to_station || "",
    departureTime:
        trainData.departureTime ||
        trainData.departure_time ||
        trainData.departure ||
        trainData.departureAt ||
        trainData.departure_at ||
        "",
    arrivalTime:
        trainData.arrivalTime ||
        trainData.arrival_time ||
        trainData.arrival ||
        trainData.arrivalAt ||
        trainData.arrival_at ||
        "",
    duration: trainData.duration || trainData.travelDuration || trainData.travel_duration || "",
    days: trainData.days || "Daily",
    trainType: trainData.trainType || trainData.train_type || "Express",
    availableClasses: trainData.availableClasses || trainData.available_classes || [
        { type: "Sleeper", fare: 500, status: "Available", color: "green", totalSeats: 100, availableSeats: 100 }
    ],
    isActive: trainData.isActive !== false,
    date: trainData.date || ""
});

// Helper function to validate train data (check duplicates and required fields)
const validateTrainData = async (trainsData) => {
    const valid = [];
    const duplicates = [];
    const invalid = [];

    // Get all existing train numbers
    const existingTrains = await Train.find({}, { trainNumber: 1, date: 1 });
    const existingTrainKeys = new Set(existingTrains.map((train) => toTrainUniqueKey(train.trainNumber, train.date)));
    const seenTrainKeys = new Set();

    for (let i = 0; i < trainsData.length; i++) {
        const trainData = trainsData[i];
        const cleanedTrainData = normalizeTrainData(trainData);

        // Check for missing required fields
        const requiredFields = ['trainNumber', 'trainName', 'from', 'to', 'departureTime', 'arrivalTime', 'duration'];
        const missingFields = requiredFields.filter(field => !cleanedTrainData[field] || cleanedTrainData[field] === "");
        
        if (missingFields.length > 0) {
            invalid.push({
                index: i + 1,
                data: trainData,
                reason: `Missing required fields: ${missingFields.join(', ')}`
            });
            continue;
        }

        const trainKey = toTrainUniqueKey(cleanedTrainData.trainNumber, cleanedTrainData.date);

        // Check for duplicate train number + date
        if (existingTrainKeys.has(trainKey)) {
            duplicates.push({
                index: i + 1,
                data: trainData,
                trainNumber: cleanedTrainData.trainNumber,
                reason: "Train already exists for the selected date"
            });
            continue;
        }

        if (seenTrainKeys.has(trainKey)) {
            duplicates.push({
                index: i + 1,
                data: trainData,
                trainNumber: cleanedTrainData.trainNumber,
                reason: "Duplicate train number + date found in uploaded file"
            });
            continue;
        }

        seenTrainKeys.add(trainKey);
        valid.push(cleanedTrainData);
    }

    return { valid, duplicates, invalid };
};

// Helper function to process train data
const processTrainData = async (trainsData, errors) => {
    const successful = [];
    const failed = [];

    for (let i = 0; i < trainsData.length; i++) {
        const trainData = trainsData[i];
        
        try {
            const cleanedTrainData = normalizeTrainData(trainData);

            const existingTrain = await Train.findOne({
                trainNumber: cleanedTrainData.trainNumber,
                date: cleanedTrainData.date
            });

            if (existingTrain) {
                errors.push(`Row ${i + 1}: Train ${cleanedTrainData.trainNumber} already exists for ${cleanedTrainData.date}`);
                failed.push(trainData);
                continue;
            }

            const newTrain = new Train(cleanedTrainData);
            const savedTrain = await newTrain.save();
            successful.push(savedTrain);

        } catch (error) {
            errors.push(`Row ${i + 1}: ${error.message}`);
            failed.push(trainData);
        }
    }

    return { successful, failed };
};
