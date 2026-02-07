const express = require('express');
const router = express.Router();
const { login, clientLogin, mobileLogin, deviceCheck, logout, register, caLogin, updateProfile } = require('../controller/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/ca-login', caLogin);
router.post('/client-login', clientLogin);
router.post('/mobile-login', mobileLogin);
router.post('/device-check', deviceCheck);
router.put('/profile', protect, updateProfile);
router.post('/logout', logout);

module.exports = router;
