const express = require('express');
const router = express.Router();
const driveController = require('../controller/driveController');
const { upload } = require('../config/fileStorage');

const { protect } = require('../middleware/authMiddleware');

// get Bin by CA
router.get('/bin/:caId', protect, driveController.getBinByCA);

// Get all financial years
router.get('/financial-years', protect, driveController.getFinancialYears);

// Get CA documents (with optional filters)
router.get('/documents', protect, driveController.getDocuments);

// Get All Data
router.get('/:clientId/all-data', protect, driveController.getAllData);

// Get Specific Folder Contents (Mobile App)
router.post('/folder', protect, driveController.getFolderContents);

// Upload File (Middleware 'upload.single' handles Cloudinary)  
router.post('/upload', protect, upload.single('file'), driveController.uploadFile);

// Create Folder
router.post('/create-folder', protect, driveController.createFolder);

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

// 11. Update Item (Rename/Move)
router.put('/update/:type/:id', protect, driveController.updateItem);

// 10. Download File
router.get('/files/download/:id', protect, driveController.downloadFile);

// 10.1 View File (Inline for Preview)
router.get('/files/view/:id', driveController.viewFile);

// Download All Files as ZIP
router.get('/download-all', protect, driveController.downloadAllZip);

// 11. Client side dedicated API
router.get('/get-client-drive', protect, driveController.getClientDrive);

// client panel
// router.get('/:clientId/all-data', protect, driveController.getAllClientData);

router.post('/folders/:id/open', protect, driveController.trackFolderOpen);

// Storage stats
router.get('/storage-stats', protect, driveController.getStorageStats);

module.exports = router;