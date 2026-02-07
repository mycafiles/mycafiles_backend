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

// 7. Get Recycle Bin Items
router.get('/:clientId/bin', protect, driveController.getBinItems);

// 8. Restore Item
router.put('/restore/:type/:id', protect, driveController.restoreItem);

// 9. Permanent Delete
router.delete('/permanent/:type/:id', protect, driveController.permanentDelete);

// 10. Download File
router.get('/files/download/:id', protect, driveController.downloadFile);

module.exports = router;