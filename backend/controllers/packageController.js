const Package = require("../models/Package");
const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require("mongoose");

const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const parseIntField = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
};
const parseFloatField = (value, fallback) => {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? fallback : parsed;
};
const PACKAGE_ALIASES = {
    bengaluru: ["bengaluru", "bangalore", "banglore"],
    mumbai: ["mumbai", "bombay"],
    delhi: ["delhi", "new delhi"],
    kolkata: ["kolkata", "calcutta"]
};
const asCaseInsensitiveRegex = (value = "") => {
    const cleaned = String(value || "").trim().toLowerCase();
    const aliasGroup = Object.values(PACKAGE_ALIASES).find((aliases) => aliases.includes(cleaned));
    const variants = (aliasGroup || [cleaned]).map((item) => escapeRegex(item));
    return new RegExp(`^(${variants.join("|")})$`, "i");
};

const normalizePackageData = (pData = {}, index = 0) => {
    const cleanedData = {
        packageId: pData.packageId || pData.packageCode || `PKG-${Date.now()}-${index}`,
        packageTitle: pData.packageTitle || pData.title || "",
        destination: pData.destination || pData.city || "",
        country: pData.country || "",
        city: pData.city || "",
        duration: pData.duration || "3N/4D",
        category: pData.category || "Holiday",
        pricePerPerson: parseFloatField(pData.pricePerPerson ?? pData.adultPrice ?? pData.price, 0),
        originalPrice: parseFloatField(pData.originalPrice, 0),
        discount: parseFloatField(pData.discount, 0),
        currency: pData.currency || "INR",
        date: pData.date || new Date().toISOString().split('T')[0],
        startLocation: pData.startLocation || pData.city || "",
        transportType: pData.transportType || "Flight",
        hotelType: pData.hotelType || "3 Star",
        mealsIncluded: pData.mealsIncluded || "Breakfast",
        thumbnailImage: pData.thumbnailImage || pData.bannerImage || "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80",
        seatsAvailable: parseIntField(pData.seatsAvailable ?? pData.totalSeats, 50),
        status: pData.status || 'Active'
    };

    ['highlights', 'included', 'excluded', 'galleryImages'].forEach(field => {
        if (pData[field]) {
            cleanedData[field] = Array.isArray(pData[field])
                ? pData[field]
                : pData[field].split(',').map(s => s.trim()).filter(Boolean);
        } else {
            cleanedData[field] = [];
        }
    });

    if (pData.itinerary) {
        if (typeof pData.itinerary === 'string') {
            try {
                cleanedData.itinerary = JSON.parse(pData.itinerary);
            } catch (e) {
                cleanedData.itinerary = [];
            }
        } else {
            cleanedData.itinerary = pData.itinerary;
        }
    } else {
        cleanedData.itinerary = [{ day: 1, title: "Arrival", description: "Arrive at destination.", activities: [] }];
    }

    return cleanedData;
};

const getMissingPackageFields = (packageData) => {
    const requiredFields = ['packageTitle', 'country', 'city', 'pricePerPerson'];
    return requiredFields.filter(field => !packageData[field]);
};

// Add Package (Admin)
exports.createPackage = async (req, res) => {
    try {
        const newPackage = new Package(req.body);
        const savedPackage = await newPackage.save();
        res.status(201).json(savedPackage);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Update Package (Admin)
exports.updatePackage = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid package ID" });
        }

        const updatedPackage = await Package.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedPackage) return res.status(404).json({ message: "Package not found" });
        res.status(200).json(updatedPackage);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete Package (Admin)
exports.deletePackage = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid package ID" });
        }

        const deletedPackage = await Package.findByIdAndDelete(req.params.id);
        if (!deletedPackage) return res.status(404).json({ message: "Package not found" });
        res.status(200).json({ message: "Package deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get All Packages (User - only Active)
exports.getAllPackages = async (req, res) => {
    try {
        const { category, minPrice, maxPrice, destination, themes, duration, countries, transportTypes, startDate } = req.query;
        let query = { status: 'Active' };

        if (category && category !== 'All') query.category = category;

        if (minPrice || maxPrice) {
            query.pricePerPerson = {};
            if (minPrice) query.pricePerPerson.$gte = Number(minPrice);
            if (maxPrice) query.pricePerPerson.$lte = Number(maxPrice);
        }

        const orFilters = [];

        if (destination) {
            const destArray = Array.isArray(destination) ? destination : destination.split(',');
            const destinationValues = destArray.map((d) => String(d || "").trim()).filter(Boolean);
            const destinationRegex = destinationValues.map((d) => asCaseInsensitiveRegex(d));
            if (destinationRegex.length > 0) {
                orFilters.push({ city: { $in: destinationRegex } });
                orFilters.push({ country: { $in: destinationRegex } });
            }
        }

        if (countries) {
            const countryArray = Array.isArray(countries) ? countries : countries.split(',');
            const countryRegex = countryArray
                .map((c) => String(c || "").trim())
                .filter(Boolean)
                .map((c) => asCaseInsensitiveRegex(c));
            if (countryRegex.length > 0) {
                orFilters.push({ country: { $in: countryRegex } });
            }
        }

        if (orFilters.length > 0) {
            query.$or = orFilters;
        }

        // We don't have themes array anymore, let's map it to category or ignore it
        if (themes) {
            const themesArray = Array.isArray(themes) ? themes : themes.split(',');
            const themeRegex = themesArray
                .map((t) => String(t || "").trim())
                .filter(Boolean)
                .map((t) => asCaseInsensitiveRegex(t));
            if (themeRegex.length > 0) {
                query.category = { $in: themeRegex };
            }
        }

        if (transportTypes) {
            const transportArray = Array.isArray(transportTypes) ? transportTypes : transportTypes.split(',');
            const transportRegex = transportArray
                .map((t) => String(t || "").trim())
                .filter(Boolean)
                .map((t) => asCaseInsensitiveRegex(t));
            if (transportRegex.length > 0) {
                query.transportType = { $in: transportRegex };
            }
        }

        if (duration) {
            // duration in new schema is a string "3N/4D". 
            // the user filter is "1-3", "4-6".
            // Since it's a string in DB now, we can only exact match or regex. This requires more complex logic.
            // Let's parse string or simply do a regex match for the N number
            const [minNights, maxNights] = duration.split('-').map(Number);

            // To be accurate we would need to map the strings or use an aggregation, 
            // but simply skipping duration filter is safer here unless we know exact strings.
            // Let's implement a regex that extracts leading digits for nights.
            // Actually, MongoDB regex on strings like "5N/6D" is ^[1-3]N/
            if (minNights) {
                // If duration string is like `${nights}N/${days}D`
                // $where is slow but works, or we can just fetch all and filter in JS or just ignore for now.
                // It's better to fetch and filter in JS if needed. For now I will skip DB filter and filter JS side or ignore duration.
            }
        }

        let packages = await Package.find(query).sort({ rating: -1 });

        if (startDate) {
            const requestedStartDate = new Date(startDate);
            if (!Number.isNaN(requestedStartDate.getTime())) {
                packages = packages.filter((pkg) => {
                    const availableFrom = pkg.availableFrom ? new Date(pkg.availableFrom) : null;
                    const availableTo = pkg.availableTo ? new Date(pkg.availableTo) : null;

                    if (availableFrom && Number.isNaN(availableFrom.getTime())) return true;
                    if (availableTo && Number.isNaN(availableTo.getTime())) return true;
                    if (availableFrom && requestedStartDate < availableFrom) return false;
                    if (availableTo && requestedStartDate > availableTo) return false;
                    return true;
                });
            }
        }

        if (duration) {
            const [minNights, maxNights] = duration.split('-').map(Number);
            packages = packages.filter(pkg => {
                const nightsMatch = pkg.duration.match(/^(\d+)N/);
                if (nightsMatch) {
                    const n = parseInt(nightsMatch[1], 10);
                    const meetsMin = minNights ? n >= minNights : true;
                    const meetsMax = maxNights ? n <= maxNights : true;
                    return meetsMin && meetsMax;
                }
                return true;
            });
        }
        res.status(200).json(packages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get All Packages (Admin - including Inactive)
exports.getAdminPackages = async (req, res) => {
    try {
        const packages = await Package.find().sort({ createdAt: -1 });
        res.status(200).json(packages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get Package by ID
exports.getPackageById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid package ID" });
        }
        const pkg = await Package.findOne({ _id: req.params.id, status: 'Active' });
        if (!pkg) return res.status(404).json({ message: "Package not found" });
        res.status(200).json(pkg);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Toggle Package Status (Admin)
exports.toggleStatus = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid package ID" });
        }

        const pkg = await Package.findById(req.params.id);
        if (!pkg) return res.status(404).json({ message: "Package not found" });

        pkg.status = pkg.status === 'Active' ? 'Inactive' : 'Active';
        await pkg.save();
        res.status(200).json(pkg);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// --- ONE TABLE OPERATIONS: Embedded Updates ---

// Add Review (User)
exports.addReview = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid package ID" });
        }

        const pkg = await Package.findById(req.params.id);
        if (!pkg) return res.status(404).json({ message: "Package not found" });

        const userId = req.user?._id;
        const userName = req.user?.name || "Customer";
        const rating = Number(req.body.rating);
        const comment = String(req.body.comment || "").trim();

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized user" });
        }

        if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({ message: "Rating must be between 1 and 5" });
        }

        if (!comment) {
            return res.status(400).json({ message: "Review comment is required" });
        }

        const review = {
            userId,
            userName,
            rating,
            comment,
            date: new Date()
        };

        pkg.reviews.push(review);
        await pkg.save(); // pre-save middleware will update stats
        res.status(201).json({ message: "Review added", reviews: pkg.reviews });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Book Package (User)
exports.bookPackage = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid package ID" });
        }

        const pkg = await Package.findById(req.params.id);
        if (!pkg) return res.status(404).json({ message: "Package not found" });
        if (pkg.status !== 'Active') {
            return res.status(400).json({ message: "This package is not available for booking right now" });
        }

        const userId = req.user?._id;
        const userName = req.user?.name || "Customer";
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized user" });
        }

        // Availability Check
        const adults = Math.max(Number(req.body.adults) || 0, 0);
        const children = Math.max(Number(req.body.children) || 0, 0);
        const requestedSeats = adults + children;
        const travelDate = req.body.travelDate ? new Date(req.body.travelDate) : null;
        const totalAmount = Number(req.body.totalAmount);

        if (!requestedSeats) {
            return res.status(400).json({ message: "At least one traveller is required" });
        }

        if (!travelDate || Number.isNaN(travelDate.getTime())) {
            return res.status(400).json({ message: "A valid travel date is required" });
        }

        if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
            return res.status(400).json({ message: "A valid total amount is required" });
        }

        if (pkg.seatsAvailable < requestedSeats) {
            return res.status(400).json({ message: "Not enough seats available" });
        }

        const booking = {
            userId,
            userName,
            bookingId: String(req.body.bookingId || ("BK-" + Math.random().toString(36).substring(2, 9).toUpperCase())),
            travelDate,
            adults,
            children,
            totalAmount,
            paymentStatus: 'Completed',
            status: 'Confirmed',
            bookedAt: new Date()
        };

        pkg.bookings.push(booking);
        pkg.seatsAvailable -= requestedSeats;

        // If seats fill up, could set status to Inactive or 'Sold Out' if added to schema. 
        // Our schema has status: 'Active' | 'Inactive', let's set it to Inactive if no seats.
        if (pkg.seatsAvailable <= 0) {
            pkg.status = 'Inactive';
        }

        await pkg.save();
        res.status(201).json({ message: "Booking successful", bookingId: booking.bookingId });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Get Unique Filter Values (User)
exports.getFilterValues = async (req, res) => {
    try {
        const categories = await Package.distinct('category', { status: 'Active' });
        const countries = await Package.distinct('country', { status: 'Active' });
        const cities = await Package.distinct('city', { status: 'Active' });
        const transportTypes = await Package.distinct('transportType', { status: 'Active' });

        res.status(200).json({
            categories: categories.sort(),
            countries: countries.sort(),
            cities: cities.sort(),
            destinations: [...new Set([...countries, ...cities])].sort(),
            transportTypes: transportTypes.sort()
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Preview package data before upload (check duplicates)
// @route   POST /api/packages/admin/preview
exports.previewPackages = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });

        const file = req.file;
        const fileExtension = file.originalname.split('.').pop().toLowerCase();

        if (fileExtension !== 'csv' && fileExtension !== 'json') {
            fs.unlinkSync(file.path);
            return res.status(400).json({ message: "Only CSV and JSON files are allowed" });
        }

        let packagesData = [];
        if (fileExtension === 'csv') {
            packagesData = await parseCSVFile(file.path);
        } else {
            packagesData = await parseJSONFile(file.path);
        }

        fs.unlinkSync(file.path);

        if (packagesData.length === 0) {
            return res.status(400).json({ message: "No valid package data found in file" });
        }

        const results = await validatePackageData(packagesData);

        res.status(200).json({
            message: "File preview processed successfully",
            totalRecords: packagesData.length,
            validRecords: results.valid.length,
            duplicateRecords: results.duplicates.length,
            invalidRecords: results.invalid.length,
            duplicates: results.duplicates,
            invalid: results.invalid,
            valid: results.valid
        });

    } catch (err) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ message: "Server Error", error: err.message });
    }
};

// @desc    Upload packages from CSV or JSON file
// @route   POST /api/packages/admin/upload
exports.uploadPackages = async (req, res) => {
    try {
        const { packagesToUpload } = req.body;

        if (!packagesToUpload || !Array.isArray(packagesToUpload)) {
            return res.status(400).json({ message: "No package data provided for upload" });
        }

        let errors = [];
        const results = await processPackageData(packagesToUpload, errors);

        res.status(200).json({
            message: "Package data uploaded successfully",
            totalRecords: packagesToUpload.length,
            successful: results.successful,
            failed: results.failed,
            errors: errors
        });

    } catch (err) {
        res.status(500).json({ message: "Server Error", error: err.message });
    }
};

const parseCSVFile = (filePath) => {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (error) => reject(error));
    });
};

const parseJSONFile = async (filePath) => {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(fileContent);
        if (Array.isArray(data)) return data;
        else if (data.packages && Array.isArray(data.packages)) return data.packages;
        else return [data];
    } catch (error) {
        throw new Error("Invalid JSON format");
    }
};

const validatePackageData = async (packagesData) => {
    const valid = [];
    const duplicates = [];
    const invalid = [];

    const existingPackages = await Package.find({}, { packageId: 1 });
    const existingIds = new Set(existingPackages.map(p => p.packageId));

    for (let i = 0; i < packagesData.length; i++) {
        const pData = packagesData[i];
        const cleanedData = normalizePackageData(pData, i);
        const missingFields = getMissingPackageFields(cleanedData);

        if (missingFields.length > 0) {
            invalid.push({ index: i + 1, data: pData, reason: `Missing required fields: ${missingFields.join(', ')}` });
            continue;
        }

        if (existingIds.has(cleanedData.packageId)) {
            duplicates.push({ index: i + 1, data: pData, packageId: cleanedData.packageId, reason: "Package ID already exists" });
            continue;
        }

        valid.push(cleanedData);
    }

    return { valid, duplicates, invalid };
};

const processPackageData = async (packagesData, errors) => {
    const successful = [];
    const failed = [];

    for (let i = 0; i < packagesData.length; i++) {
        try {
            const normalizedPackage = normalizePackageData(packagesData[i], i);
            const newPkg = new Package(normalizedPackage);
            const savedPkg = await newPkg.save();
            successful.push(savedPkg);
        } catch (error) {
            errors.push(`Row ${i + 1}: ${error.message}`);
            failed.push(packagesData[i]);
        }
    }

    return { successful, failed };
};
