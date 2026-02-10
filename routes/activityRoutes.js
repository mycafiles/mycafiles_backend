const express = require('express');
const router = express.Router();
const activityController = require('../controller/activityController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, activityController.getLogs);

module.exports = router;
