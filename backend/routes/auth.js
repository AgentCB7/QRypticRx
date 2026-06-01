const express = require('express');
const router = express.Router();
const { register, login, verifyEmail, loginVerify, resendOtp } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/login/verify', loginVerify);
router.post('/verify-email', verifyEmail);
router.post('/resend-otp', resendOtp);

module.exports = router;
