const express = require('express');
const router = express.Router();
const activityController = require('../controller/activityController');
const { protect } = require('../middleware/authMiddleware');

router.get('/get-ca-logs', protect, activityController.getLogs);
router.get('/get-client-logs', protect, activityController.getClientLogs);

module.exports = router;
