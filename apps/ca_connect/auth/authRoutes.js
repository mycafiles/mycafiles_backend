const express = require('express');
const router = express.Router();
const { checkUser, loginConfirm } = require('./authController');

router.post('/check-user', checkUser);
router.post('/login-confirm', loginConfirm);

module.exports = router;
