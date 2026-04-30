// const express = require('express');
// const router = express.Router();
// const dashboardController = require('../controller/dashboardController');
// const { protect } = require('../middleware/authMiddleware');
// const { upload } = require('../config/fileStorage');

// // All mobile routes are protected
// // router.use(protect); // Commented out per user request for direct body testing

// router.post('/stats', dashboardController.getMobileStats);
// router.post('/folder-structure', dashboardController.getMobileFolderStructure);

// // Profile Management
// router.post('/profile', dashboardController.getMobileClientData);
// router.post('/profile/update', dashboardController.updateMobileProfile);

// // Folder Management
// router.post('/folders/create', dashboardController.createMobileFolder);
// router.post('/folders/update', dashboardController.updateMobileFolder);
// router.post('/folders/delete', dashboardController.deleteMobileFolder);

// // File Management
// router.post('/files/upload', upload.single('file'), dashboardController.uploadMobileFile);
// router.post('/files/delete', dashboardController.deleteMobileFile);

// // KYC Management
// router.post('/kyc/upload', upload.single('file'), dashboardController.uploadMobileFile);

// module.exports = router;

const express = require('express');
const router = express.Router();
const dashboardController = require('../controller/dashboardController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../config/fileStorage');

// All mobile routes are protected
// router.use(protect); // Commented out per user request for direct body testing

router.post('/stats', dashboardController.getMobileStats);
router.post('/folder-structure', dashboardController.getMobileFolderStructure);

// Profile Management
router.post('/profile', dashboardController.getMobileClientData);
router.post('/profile/update', dashboardController.updateMobileProfile);

// Folder Management
router.post('/folders/create', dashboardController.createMobileFolder);
router.post('/folders/update', dashboardController.updateMobileFolder);
router.post('/folders/delete', dashboardController.deleteMobileFolder);

// File Management
router.post('/files/upload', upload.single('file'), dashboardController.uploadMobileFile);
router.post('/files', dashboardController.getFolderDocuments); // New Route
router.post('/files/delete', dashboardController.deleteMobileFile);

// KYC Management
router.post('/kyc/upload', upload.single('file'), dashboardController.uploadMobileFile);

module.exports = router;