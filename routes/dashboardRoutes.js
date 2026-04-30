const express = require('express');
const { getDashboardStats, getClientDashboardStats } = require('../controller/dashboardController');
const { protect, admin } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/stats', protect, admin, getDashboardStats);
router.get('/client-stats', protect, getClientDashboardStats);

module.exports = router;
