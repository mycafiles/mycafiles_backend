const express = require('express');
const router = express.Router();
const driveController = require('../controller/driveController');
const { upload } = require('../config/fileStorage');

const { protect } = require('../middleware/authMiddleware');

// Get All Data
router.get('/:clientId/all-data', driveController.getAllData);

// Get Specific Folder Contents (Mobile App)
router.post('/folder', protect, driveController.getFolderContents);

// Upload File (Middleware 'upload.single' handles Cloudinary)
router.post('/upload', upload.single('file'), driveController.uploadFile);

// Create Folder
router.post('/folders', driveController.createFolder);

// Delete File
router.delete('/files/:id', protect, driveController.deleteFile);

// Delete Folder
router.delete('/folders/:id', protect, driveController.deleteFolder);

module.exports = router;