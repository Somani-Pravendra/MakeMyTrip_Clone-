const express = require("express");
const router = express.Router();
const packageController = require("../controllers/packageController");
const upload = require("../middleware/uploadMiddleware");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

// Public Routes (User)
router.get("/", packageController.getAllPackages);
router.get("/filters", packageController.getFilterValues);

// Admin Routes
router.get("/admin/all", authMiddleware, adminMiddleware, packageController.getAdminPackages);
router.post("/add", authMiddleware, adminMiddleware, packageController.createPackage);
router.put("/update/:id", authMiddleware, adminMiddleware, packageController.updatePackage);
router.delete("/delete/:id", authMiddleware, adminMiddleware, packageController.deletePackage);
router.patch("/toggle-status/:id", authMiddleware, adminMiddleware, packageController.toggleStatus);

// Admin Upload Routes
router.post("/admin/preview", authMiddleware, adminMiddleware, upload.single('file'), packageController.previewPackages);
router.post("/admin/upload", authMiddleware, adminMiddleware, packageController.uploadPackages);

// Embedded Updates (One-Table Logic)
router.post("/:id/book", authMiddleware, packageController.bookPackage);
router.post("/:id/review", authMiddleware, packageController.addReview);
router.get("/:id", packageController.getPackageById);

module.exports = router;
