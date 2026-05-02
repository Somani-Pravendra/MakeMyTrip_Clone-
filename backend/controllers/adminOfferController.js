const Offer = require("../models/Offer");
const mongoose = require("mongoose");
const fs = require("fs");
const csv = require("csv-parser");

const normalizeOfferCategory = (category = "all") => {
    const normalized = String(category || "").trim().toLowerCase();

    if (["flight", "flights"].includes(normalized)) return "flights";
    if (["hotel", "hotels"].includes(normalized)) return "hotels";
    if (["train", "trains"].includes(normalized)) return "trains";
    if (["bus", "buses"].includes(normalized)) return "bus";
    if (["cab", "cabs"].includes(normalized)) return "cabs";
    if (["holiday", "holidays", "package", "packages"].includes(normalized)) return "packages";
    return "all";
};

const normalizeOfferData = (offer = {}, index = 0) => {
    const discountType = String(offer.discountType || offer.discount_type || "percentage").toLowerCase() === "flat"
        ? "flat"
        : "percentage";

    return {
        title: offer.title || offer.offerTitle || offer.offer_title || "",
        description: offer.description || offer.offerDescription || offer.offer_description || "",
        promoCode: String(offer.promoCode || offer.promo_code || offer.code || offer.offerCode || `OFFER${Date.now()}${index}`).trim().toUpperCase(),
        discountType,
        discountValue: Number(offer.discountValue || offer.discount_value || offer.value || offer.discount || 0),
        minBookingAmount: Number(offer.minBookingAmount || offer.min_booking_amount || offer.minimumBookingAmount || 0),
        maxDiscount: Number(offer.maxDiscount || offer.max_discount || 0),
        validTill: offer.validTill || offer.valid_till || offer.expiryDate || offer.expiry_date || offer.validity || "",
        category: normalizeOfferCategory(offer.category),
        imageUrl: offer.imageUrl || offer.image_url || offer.bannerImage || offer.banner_image || "",
        isActive: typeof offer.isActive === "boolean"
            ? offer.isActive
            : String(offer.status || offer.isActive || "active").toLowerCase() !== "inactive"
    };
};

const getMissingOfferFields = (offer) => {
    const requiredFields = ["title", "description", "promoCode", "discountValue", "validTill"];
    return requiredFields.filter((field) => !offer[field]);
};

const parseOfferCSVFile = (filePath) => new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (data) => results.push(data))
        .on("end", () => resolve(results))
        .on("error", (error) => reject(error));
});

const parseOfferJSONFile = async (filePath) => {
    try {
        const fileContent = fs.readFileSync(filePath, "utf8");
        const data = JSON.parse(fileContent);
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.offers)) return data.offers;
        return [data];
    } catch (error) {
        throw new Error("Invalid JSON format");
    }
};

// Get all offers (Admin)
exports.getAllOffers = async (req, res) => {
    try {
        const offers = await Offer.find().sort({ createdAt: -1 });
        res.json(offers);
    } catch (error) {
        res.status(500).json({ message: "Error fetching offers" });
    }
};

// Create a new offer
exports.createOffer = async (req, res) => {
    try {
        const newOffer = new Offer(req.body);
        await newOffer.save();
        res.status(201).json({ message: "Offer created successfully", offer: newOffer });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "Promo code already exists" });
        }
        res.status(500).json({ message: "Error creating offer" });
    }
};

// Update an offer
exports.updateOffer = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid offer ID" });
        }
        const updatedOffer = await Offer.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
        
        if (!updatedOffer) {
            return res.status(404).json({ message: "Offer not found" });
        }
        
        res.json({ message: "Offer updated successfully", offer: updatedOffer });
    } catch (error) {
        res.status(500).json({ message: "Error updating offer" });
    }
};

// Delete an offer
exports.deleteOffer = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid offer ID" });
        }
        const deletedOffer = await Offer.findByIdAndDelete(id);
        
        if (!deletedOffer) {
            return res.status(404).json({ message: "Offer not found" });
        }
        
        res.json({ message: "Offer deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting offer" });
    }
};

// Toggle offer status (Active/Inactive)
exports.toggleOfferStatus = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid offer ID" });
        }
        const offer = await Offer.findById(id);
        
        if (!offer) {
            return res.status(404).json({ message: "Offer not found" });
        }
        
        offer.isActive = !offer.isActive;
        await offer.save();
        
        res.json({ message: `Offer ${offer.isActive ? 'activated' : 'deactivated'} successfully`, offer });
    } catch (error) {
        res.status(500).json({ message: "Error toggling offer status" });
    }
};

exports.previewOffers = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const file = req.file;
        const fileExtension = file.originalname.split(".").pop().toLowerCase();

        if (fileExtension !== "csv" && fileExtension !== "json") {
            fs.unlinkSync(file.path);
            return res.status(400).json({ message: "Only CSV and JSON files are allowed" });
        }

        const offersData = fileExtension === "csv"
            ? await parseOfferCSVFile(file.path)
            : await parseOfferJSONFile(file.path);

        fs.unlinkSync(file.path);

        if (offersData.length === 0) {
            return res.status(400).json({ message: "No valid offer data found in file" });
        }

        const valid = [];
        const duplicates = [];
        const invalid = [];
        const existingCodes = new Set((await Offer.find({}, { promoCode: 1 })).map((offer) => String(offer.promoCode).toUpperCase()));
        const seenCodes = new Set();

        for (let i = 0; i < offersData.length; i++) {
            const rawOffer = offersData[i];
            const cleanedOffer = normalizeOfferData(rawOffer, i);
            const missingFields = getMissingOfferFields(cleanedOffer);

            if (missingFields.length > 0) {
                invalid.push({
                    index: i + 1,
                    data: rawOffer,
                    reason: `Missing required fields: ${missingFields.join(", ")}`
                });
                continue;
            }

            if (existingCodes.has(cleanedOffer.promoCode) || seenCodes.has(cleanedOffer.promoCode)) {
                duplicates.push({
                    index: i + 1,
                    data: rawOffer,
                    promoCode: cleanedOffer.promoCode,
                    reason: "Promo code already exists"
                });
                continue;
            }

            seenCodes.add(cleanedOffer.promoCode);
            valid.push(cleanedOffer);
        }

        res.status(200).json({
            message: "File preview processed successfully",
            totalRecords: offersData.length,
            validRecords: valid.length,
            duplicateRecords: duplicates.length,
            invalidRecords: invalid.length,
            duplicates,
            invalid,
            valid
        });
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ message: "Server Error" });
    }
};

exports.uploadOffers = async (req, res) => {
    try {
        const { offersToUpload } = req.body;

        if (!offersToUpload || !Array.isArray(offersToUpload)) {
            return res.status(400).json({ message: "No offer data provided for upload" });
        }

        const successful = [];
        const failed = [];
        const errors = [];

        for (let i = 0; i < offersToUpload.length; i++) {
            try {
                const normalizedOffer = normalizeOfferData(offersToUpload[i], i);
                const savedOffer = await new Offer(normalizedOffer).save();
                successful.push(savedOffer);
            } catch (error) {
                failed.push(offersToUpload[i]);
                errors.push(`Row ${i + 1}: ${error.message}`);
            }
        }

        res.status(200).json({
            message: "Offer data uploaded successfully",
            totalRecords: offersToUpload.length,
            successful,
            failed,
            errors
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};
