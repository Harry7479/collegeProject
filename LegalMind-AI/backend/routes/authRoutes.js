const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/authController');
const { sendOTP, verifyOTP, resetOTP, resetVerifyOTP, resetPassword } = require('../controllers/otpController');

// Jab koi frontend se HTTP request bhejega in URLs pe, toh hum controller ko call karenge
router.post('/register', registerUser);
router.post('/login', loginUser);

// OTP routes
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/reset-otp', resetOTP);
router.post('/validate-otp', resetVerifyOTP);
router.post('/reset-password', resetPassword);

module.exports = router;
