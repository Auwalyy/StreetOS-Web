const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  register, login, refreshToken, verifyEmail,
  forgotPassword, resetPassword, getMe, updateProfile,
  changePassword, logout,
} = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.get('/me', protect, getMe);
router.put('/me', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.post('/logout', protect, logout);

module.exports = router;
