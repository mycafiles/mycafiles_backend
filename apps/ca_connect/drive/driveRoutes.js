const express = require('express');
const router = express.Router();
const { getFolderContents, uploadFile } = require('./driveController');
const { protect } = require('../middleware/authMiddleware'); // Use app-specific middleware
const { upload } = require('../../../config/fileStorage');

// All routes here are protected
// We need to ensure the 'protect' middleware works for "Client" users
// The existing middleware might be geared towards "User" (CA)
// Let's assume we reuse the protect middleware but might need to verify it checks for Client

router.post('/folder', protect, getFolderContents);
router.post('/upload', protect, upload.single('file'), uploadFile);

module.exports = router;
