const express = require('express');
const router = express.Router();
const { login, clientLogin, mobileLogin, deviceCheck, logout, register, caLogin } = require('../controller/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/ca-login', caLogin);
router.post('/client-login', clientLogin);
router.post('/mobile-login', mobileLogin);
router.post('/device-check', deviceCheck);
router.post('/logout', logout);

module.exports = router;
