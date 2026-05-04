const express = require('express');
const router = express.Router();
const {
    login, clientLogin, mobileLogin, deviceCheck, logout, register, caLogin,
    updateProfile, forgotPassword, resetPassword, getGroupMembers,
    switchClient, getAllUsers, checkClientExists, firebaseMobileLogin,
    googleAuth, googleCallback, getMe, updateProfessionalIdentity,
    updateClientProfileMe,
    getMyCA
} = require('../controller/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/ca-login', caLogin);
router.post('/client-login', clientLogin);
router.post('/mobile-login', mobileLogin);
router.post('/device-check', deviceCheck);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/professional-identity', protect, updateProfessionalIdentity);
router.put('/client-profile', protect, updateClientProfileMe);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/logout', logout);
router.get('/group-members', protect, getGroupMembers);
router.post('/switch-client', protect, switchClient);
router.get('/my-ca', protect, getMyCA);

// Mobile V2 (Firebase OTP)
router.post('/mobile-v2/check-client', checkClientExists);
router.post('/mobile-v2/firebase-login', firebaseMobileLogin);

// Google OAuth
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);

// Test/Unprotected route
router.get('/all-users', getAllUsers);

module.exports = router;
