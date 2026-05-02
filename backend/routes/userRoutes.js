
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/User");

router.get("/me", authMiddleware, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

router.patch("/me", authMiddleware, async (req, res) => {
    try {
        const {
            name,
            email,
            mobile,
            dateOfBirth,
            gender,
            address,
            city,
            state,
            pincode,
            country
        } = req.body;
        const userId = req.user._id;
        const updates = {};

        if (typeof name === "string") {
            const trimmedName = name.trim();
            if (!trimmedName) {
                return res.status(400).json({ success: false, message: "Name is required" });
            }
            updates.name = trimmedName;
        }

        if (email !== undefined) {
            const trimmedEmail = String(email).trim().toLowerCase();
            if (!trimmedEmail) {
                return res.status(400).json({ success: false, message: "Email is required" });
            }

            const existingEmailUser = await User.findOne({
                email: trimmedEmail,
                _id: { $ne: userId }
            }).select("_id");

            if (existingEmailUser) {
                return res.status(409).json({ success: false, message: "Email is already in use" });
            }

            updates.email = trimmedEmail;
        }

        if (mobile !== undefined) {
            const trimmedMobile = String(mobile).trim();

            if (trimmedMobile) {
                const existingMobileUser = await User.findOne({
                    mobile: trimmedMobile,
                    _id: { $ne: userId }
                }).select("_id");

                if (existingMobileUser) {
                    return res.status(409).json({ success: false, message: "Mobile number is already in use" });
                }
            }

            updates.mobile = trimmedMobile;
        }

        if (dateOfBirth !== undefined) {
            if (!dateOfBirth) {
                updates.dateOfBirth = null;
            } else {
                const parsedDate = new Date(dateOfBirth);
                if (Number.isNaN(parsedDate.getTime())) {
                    return res.status(400).json({ success: false, message: "Date of birth is invalid" });
                }
                updates.dateOfBirth = parsedDate;
            }
        }

        if (gender !== undefined) {
            updates.gender = String(gender).trim();
        }

        if (address !== undefined) {
            updates.address = String(address).trim();
        }

        if (city !== undefined) {
            updates.city = String(city).trim();
        }

        if (state !== undefined) {
            updates.state = String(state).trim();
        }

        if (pincode !== undefined) {
            updates.pincode = String(pincode).trim();
        }

        if (country !== undefined) {
            const trimmedCountry = String(country).trim();
            updates.country = trimmedCountry || "India";
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updates },
            { new: true, runValidators: true }
        ).select("-password");

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({
            success: true,
            message: "Profile updated successfully",
            user: updatedUser
        });
    } catch (error) {
        console.error("Profile update error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to update profile"
        });
    }
});

module.exports = router;
