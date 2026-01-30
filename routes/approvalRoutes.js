const express = require('express');
const router = express.Router();
const { getPendingRequests, handleApproval } = require('../controller/approvalController');
const { protect } = require('../middleware/authMiddleware'); // Assuming this exists for CA auth

router.get('/', protect, getPendingRequests);
router.put('/:id', protect, handleApproval);

module.exports = router;
