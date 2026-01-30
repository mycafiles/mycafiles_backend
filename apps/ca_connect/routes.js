const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth/authRoutes'));
// router.use('/user', require('./user/userRoutes')); // Placeholder
router.use('/drive', require('./drive/driveRoutes'));
router.use('/banners', require('../../routes/bannerRoutes'));

module.exports = router;
