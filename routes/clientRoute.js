const express = require('express');
const multer = require('multer');
const path = require('path');
const {
    createClient,
    viewClients,
    editClient,
    deleteClient,
    getClientData,
    bulkUploadClients,
    approveDevice,
    getGSTClients,
    getITRClients,
    getTDSClients,
    getKYCClients,
    getClientsByGroupName,
    updateClientStatus,
    selfDelete
} = require('../controller/clientController');
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
router.get('/allclients', viewClients);
router.get('/get-gst-clients', getGSTClients);
router.get('/get-itr-clients', getITRClients);
router.get('/get-tds-clients', getTDSClients);
router.get('/get-kyc-clients', getKYCClients);
router.get('/group/:groupName', getClientsByGroupName);
router.get('/view/:clientId', getClientData);
router.put('/edit/:id', editClient);
router.put("/update-status/:id", updateClientStatus)
router.delete('/delete/:id', deleteClient);
router.delete('/self-delete', selfDelete);
router.post('/bulk', upload.single('file'), bulkUploadClients);
router.post('/approve-device/:id', approveDevice);

module.exports = router;
