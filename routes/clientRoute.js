const express = require('express');
const multer = require('multer');
const path = require('path');
const { createClient, viewClients, editClient, deleteClient, bulkUploadClients, approveDevice } = require('../controller/clientController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Multer Config for CSV
const upload = multer({
    dest: 'uploads/',
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.csv' || ext === '.xlsx' || ext === '.xls') {
            cb(null, true);
        } else {
            cb(new Error('Only CSV and Excel files are allowed'), false);
        }
    }
});

// protect all routes
router.use(protect);

router.post('/create', createClient);
router.get('/view', viewClients);
router.put('/edit/:id', editClient);
router.delete('/delete/:id', deleteClient);
router.post('/bulk', upload.single('file'), bulkUploadClients);
router.post('/approve-device/:id', approveDevice);

module.exports = router;
