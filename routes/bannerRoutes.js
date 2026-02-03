const express = require('express');
const router = express.Router();
const { getBanners, getAllBannersAdmin, createBanner, deleteBanner, toggleBanner, getBannersByBody } = require('../controllers/bannerController');
const { protect, admin } = require('../middleware/authMiddleware');

// Public/Client route
router.get('/', getBanners);
router.post('/fetch', getBannersByBody);

// Admin routes
const { upload } = require('../middleware/uploadMiddleware');

// Admin routes
router.get('/admin', protect, admin, getAllBannersAdmin);
router.post('/', protect, admin, upload.single('image'), createBanner);
router.delete('/:id', protect, admin, deleteBanner);
router.patch('/:id/toggle', protect, admin, toggleBanner);

module.exports = router;
