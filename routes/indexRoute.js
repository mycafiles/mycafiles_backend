const express = require('express');
const router = express.Router();

router.use('/auth', require('./authRoutes'));
router.use('/ca', require('./caRoutes'));
router.use('/client', require('./clientRoute'));
router.use('/drive', require('./driveRoutes'));
router.use('/approvals', require('./approvalRoutes'));
// router.use('/banners', require('./bannerRoutes')); // Moved to ca_connect

module.exports = router;