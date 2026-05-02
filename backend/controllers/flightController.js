const Flight = require("../models/Flight");
const mongoose = require("mongoose");
const fs = require('fs');
const csv = require('csv-parser');

const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const toCiRegex = (value = "") => new RegExp(escapeRegex(String(value).trim()), "i");
const toFlightUniqueKey = (flightNumber = "", date = "") => `${String(flightNumber).trim().toUpperCase()}__${String(date).trim()}`;
const parseIntField = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
};
const parseFloatField = (value, fallback) => {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? fallback : parsed;
};
const parseBooleanField = (value, fallback = false) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;

    const normalized = String(value ?? "").trim().toLowerCase();
    if (!normalized) return fallback;
    if (["true", "1", "yes", "y"].includes(normalized)) return true;
    if (["false", "0", "no", "n"].includes(normalized)) return false;
    return fallback;
};
const splitStringList = (value = "", separators = /[;,]/) =>
    String(value)
        .split(separators)
        .map((item) => item.trim())
        .filter(Boolean);
const getDefaultFlightFares = (basePrice = 0, totalFare = 0) => {
    const normalizedBasePrice = Math.max(parseFloatField(basePrice, 0), 0);
    const normalizedTotalFare = Math.max(parseFloatField(totalFare, normalizedBasePrice), normalizedBasePrice);
    const plusPrice = normalizedTotalFare > 0
        ? normalizedTotalFare
        : normalizedBasePrice > 0
            ? normalizedBasePrice + 1500
            : 1500;

    return [
        { type: "SAVER", price: normalizedBasePrice, benefits: ["15kg Baggage", "Meals Included"] },
        { type: "PLUS", price: plusPrice, benefits: ["25kg Baggage", "Premium Meals", "Free Seat Selection"] }
    ];
};
const parseFareItem = (fare, index = 0) => {
    if (!fare || typeof fare !== "object" || Array.isArray(fare)) {
        throw new Error(`Invalid fare entry at position ${index + 1}`);
    }

    const type = String(fare.type || fare.class || fare.name || "").trim();
    if (!type) {
        throw new Error(`Fare type is required at position ${index + 1}`);
    }

    const price = parseFloatField(fare.price ?? fare.amount ?? fare.fare, Number.NaN);
    if (Number.isNaN(price)) {
        throw new Error(`Fare price is invalid for ${type}`);
    }

    let benefits = [];
    if (Array.isArray(fare.benefits)) {
        benefits = fare.benefits.map((item) => String(item).trim()).filter(Boolean);
    } else if (typeof fare.benefits === "string") {
        benefits = splitStringList(fare.benefits);
    }

    return {
        type,
        price,
        benefits
    };
};
const parseFaresField = (faresValue, fallbackBasePrice = 0, fallbackTotalFare = 0) => {
    if (Array.isArray(faresValue)) {
        const normalizedFares = faresValue.map((fare, index) => parseFareItem(fare, index));
        if (normalizedFares.length === 0) {
            throw new Error("Fares array cannot be empty");
        }
        return normalizedFares;
    }

    if (faresValue && typeof faresValue === "object") {
        return [parseFareItem(faresValue, 0)];
    }

    const rawValue = String(faresValue ?? "").trim();
    if (!rawValue) {
        return getDefaultFlightFares(fallbackBasePrice, fallbackTotalFare);
    }

    if (rawValue.startsWith("[") || rawValue.startsWith("{")) {
        try {
            return parseFaresField(JSON.parse(rawValue), fallbackBasePrice, fallbackTotalFare);
        } catch (error) {
            throw new Error("Unable to parse fares JSON");
        }
    }

    const fareEntries = rawValue
        .split("|")
        .map((entry) => entry.trim())
        .filter(Boolean);

    if (fareEntries.length === 0) {
        return getDefaultFlightFares(fallbackBasePrice, fallbackTotalFare);
    }

    return fareEntries.map((entry, index) => {
        const separatorIndex = entry.indexOf(":");
        if (separatorIndex <= 0) {
            throw new Error(`Fare entry "${entry}" must use "Type:Price" format`);
        }

        const type = entry.slice(0, separatorIndex).trim();
        const details = entry.slice(separatorIndex + 1).trim();
        const [priceValue, benefitsValue] = details.split(/->|=/, 2).map((item) => item.trim());
        const price = parseFloatField(priceValue, Number.NaN);

        if (!type || Number.isNaN(price)) {
            throw new Error(`Fare entry "${entry}" has invalid type or price`);
        }

        return {
            type,
            price,
            benefits: benefitsValue ? splitStringList(benefitsValue) : []
        };
    });
};
const CITY_ALIASES = {
    bengaluru: ["bengaluru", "bangalore", "banglore"],
    mumbai: ["mumbai", "bombay"],
    delhi: ["delhi", "new delhi"],
    kolkata: ["kolkata", "calcutta"]
};
const toTitleCase = (value = "") =>
    String(value)
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(" ");
const normalizeCityName = (value = "") => {
    const cleaned = String(value || "").trim().toLowerCase();
    if (!cleaned) return "";

    const canonicalEntry = Object.entries(CITY_ALIASES).find(([, aliases]) => aliases.includes(cleaned));
    if (!canonicalEntry) {
        return toTitleCase(cleaned);
    }

    return toTitleCase(canonicalEntry[0]);
};
const normalizeStops = (value = "") => {
    const normalized = String(value || "").trim().toLowerCase();

    if (!normalized) return "Non Stop";
    if (normalized === "0" || normalized === "0 stops" || normalized === "non-stop" || normalized === "non stop" || normalized === "nonstop") {
        return "Non Stop";
    }
    if (normalized === "1" || normalized === "1 stop" || normalized === "one stop") {
        return "1 Stop";
    }
    if (normalized === "2" || normalized === "2 stops" || normalized === "2+ stops" || normalized === "two stops" || normalized === "2+ stop") {
        return "2+ Stops";
    }

    return value;
};

// @desc    Get all flights
// @route   GET /api/admin/flights
exports.getAllFlights = async (req, res) => {
    try {
        const { from, to, date } = req.query;
        let query = {};
        const fromValue = String(from || "").trim();
        const toValue = String(to || "").trim();
        
        if (fromValue) query.from = toCiRegex(fromValue);
        if (toValue) query.to = toCiRegex(toValue);
        if (date) query.date = date;

        const flights = await Flight.find(query).sort({ departureTime: 1 });
        res.json(flights);
    } catch (err) {
        res.status(500).json({ message: "Server Error", error: err.message });
    }
};

// @desc    Create a new flight
// @route   POST /api/admin/flights
exports.createFlight = async (req, res) => {
    try {
        const incomingFlight = normalizeFlightData(req.body);
        const existingFlight = await Flight.findOne({
            flightNumber: incomingFlight.flightNumber,
            date: incomingFlight.date
        });

        if (existingFlight) {
            return res.status(400).json({
                message: `Flight ${incomingFlight.flightNumber} already exists for ${incomingFlight.date}`
            });
        }

        const newFlight = new Flight(incomingFlight);
        const flight = await newFlight.save();
        res.status(201).json(flight);
    } catch (err) {
        res.status(400).json({ message: "Error creating flight", error: err.message });
    }
};

// @desc    Update a flight
// @route   PUT /api/admin/flights/:id
exports.updateFlight = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid flight ID" });
        }

        const nextFlightData = normalizeFlightData(req.body);
        const duplicateFlight = await Flight.findOne({
            _id: { $ne: req.params.id },
            flightNumber: nextFlightData.flightNumber,
            date: nextFlightData.date
        });

        if (duplicateFlight) {
            return res.status(400).json({
                message: `Flight ${nextFlightData.flightNumber} already exists for ${nextFlightData.date}`
            });
        }

        const flight = await Flight.findByIdAndUpdate(
            req.params.id,
            nextFlightData,
            { new: true, runValidators: true }
        );
        if (!flight) return res.status(404).json({ message: "Flight not found" });
        res.json(flight);
    } catch (err) {
        res.status(400).json({ message: "Error updating flight", error: err.message });
    }
};

// @desc    Delete a flight
// @route   DELETE /api/admin/flights/:id
exports.deleteFlight = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid flight ID" });
        }

        const flight = await Flight.findByIdAndDelete(req.params.id);
        if (!flight) return res.status(404).json({ message: "Flight not found" });
        res.json({ message: "Flight deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Server Error", error: err.message });
    }
};

// @desc    Preview flight data before upload (check duplicates)
// @route   POST /api/admin/flights/preview
exports.previewFlights = async (req, res) => {
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

        let flightsData = [];

        if (fileExtension === 'csv') {
            flightsData = await parseCSVFile(file.path);
        } else {
            flightsData = await parseJSONFile(file.path);
        }

        // Clean up uploaded file
        fs.unlinkSync(file.path);

        if (flightsData.length === 0) {
            return res.status(400).json({ message: "No valid flight data found in file" });
        }

        // Check for duplicates and validate
        const results = await validateFlightData(flightsData);
        
        res.status(200).json({
            message: "File preview processed successfully",
            totalRecords: flightsData.length,
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

// @desc    Upload flights from CSV or JSON file (confirmed upload)
// @route   POST /api/admin/flights/upload
exports.uploadFlights = async (req, res) => {
    try {
        const { flightsToUpload } = req.body;
        
        if (!flightsToUpload || !Array.isArray(flightsToUpload)) {
            return res.status(400).json({ message: "No flight data provided for upload" });
        }

        let errors = [];
        const results = await processFlightData(flightsToUpload, errors);
        
        res.status(200).json({
            message: "Flight data uploaded successfully",
            totalRecords: flightsToUpload.length,
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
        } else if (data.flights && Array.isArray(data.flights)) {
            return data.flights;
        } else {
            return [data];
        }
    } catch (error) {
        throw new Error("Invalid JSON format");
    }
};

const normalizeFlightData = (flightData = {}) => {
    const basePrice = parseFloatField(flightData.basePrice ?? flightData.base_price, 0);
    const totalFare = parseFloatField(flightData.totalFare ?? flightData.total_fare, 0);

    return {
        airline: flightData.airline || flightData.airlineName || "",
        airlineName: flightData.airlineName || flightData.airline || "",
        flightNumber: String(flightData.flightNumber || flightData.flight_number || "").trim().toUpperCase(),
        flightType: flightData.flightType || flightData.flight_type || "Domestic",
        logo: flightData.logo || "https://imgak.mmtcdn.com/flights/assets/media/dt/common/icons/6E.png",
        from: normalizeCityName(flightData.from || flightData.departureCity || flightData.departure_city || ""),
        to: normalizeCityName(flightData.to || flightData.arrivalCity || flightData.arrival_city || ""),
        departureCity: normalizeCityName(flightData.departureCity || flightData.departure_city || flightData.from || ""),
        arrivalCity: normalizeCityName(flightData.arrivalCity || flightData.arrival_city || flightData.to || ""),
        date: String(flightData.date || "").trim(),
        departureTime: flightData.departureTime || flightData.departure_time || "",
        arrivalTime: flightData.arrivalTime || flightData.arrival_time || "",
        duration: flightData.duration || "",
        stops: normalizeStops(flightData.stops),
        basePrice,
        totalFare,
        currency: flightData.currency || "INR",
        passportRequired: parseBooleanField(flightData.passportRequired ?? flightData.passport_required, false),
        visaRequired: parseBooleanField(flightData.visaRequired ?? flightData.visa_required, false),
        availableSeats: parseIntField(flightData.availableSeats ?? flightData.available_seats, 60),
        fares: parseFaresField(flightData.fares, basePrice, totalFare)
    };
};

// Helper function to validate flight data (check duplicates and required fields)
const validateFlightData = async (flightsData) => {
    const valid = [];
    const duplicates = [];
    const invalid = [];

    // Get all existing flight numbers
    const existingFlights = await Flight.find({}, { flightNumber: 1, date: 1 });
    const existingFlightKeys = new Set(existingFlights.map((flight) => toFlightUniqueKey(flight.flightNumber, flight.date)));
    const seenKeysInUpload = new Set();

    for (let i = 0; i < flightsData.length; i++) {
        const flightData = flightsData[i];
        let cleanedFlightData;

        try {
            cleanedFlightData = normalizeFlightData(flightData);
        } catch (error) {
            invalid.push({
                index: i + 1,
                data: flightData,
                reason: error.message
            });
            continue;
        }

        // Check for missing required fields
        const requiredFields = ['flightNumber', 'from', 'to', 'date', 'departureTime', 'arrivalTime'];
        const missingFields = requiredFields.filter(field => !cleanedFlightData[field]);
        
        if (missingFields.length > 0) {
            invalid.push({
                index: i + 1,
                data: flightData,
                reason: `Missing required fields: ${missingFields.join(', ')}`
            });
            continue;
        }

        const flightKey = toFlightUniqueKey(cleanedFlightData.flightNumber, cleanedFlightData.date);

        if (existingFlightKeys.has(flightKey)) {
            duplicates.push({
                index: i + 1,
                data: flightData,
                flightNumber: cleanedFlightData.flightNumber,
                reason: "Flight already exists for the selected date"
            });
            continue;
        }

        if (seenKeysInUpload.has(flightKey)) {
            duplicates.push({
                index: i + 1,
                data: flightData,
                flightNumber: cleanedFlightData.flightNumber,
                reason: "Duplicate flight number + date found in uploaded file"
            });
            continue;
        }

        seenKeysInUpload.add(flightKey);
        valid.push(cleanedFlightData);
    }

    return { valid, duplicates, invalid };
};
const processFlightData = async (flightsData, errors) => {
    const successful = [];
    const failed = [];

    for (let i = 0; i < flightsData.length; i++) {
        const flightData = flightsData[i];
        
        try {
            const cleanedFlightData = normalizeFlightData(flightData);

            // Validate required fields
            if (!cleanedFlightData.flightNumber || !cleanedFlightData.from || !cleanedFlightData.to || !cleanedFlightData.date || !cleanedFlightData.departureTime || !cleanedFlightData.arrivalTime) {
                errors.push(`Row ${i + 1}: Missing required fields`);
                failed.push(flightData);
                continue;
            }

            const existingFlight = await Flight.findOne({
                flightNumber: cleanedFlightData.flightNumber,
                date: cleanedFlightData.date
            });
            if (existingFlight) {
                errors.push(`Row ${i + 1}: Flight ${cleanedFlightData.flightNumber} already exists for ${cleanedFlightData.date}`);
                failed.push(flightData);
                continue;
            }

            const newFlight = new Flight(cleanedFlightData);
            const savedFlight = await newFlight.save();
            successful.push(savedFlight);

        } catch (error) {
            errors.push(`Row ${i + 1}: ${error.message}`);
            failed.push(flightData);
        }
    }

    return { successful, failed };
};
