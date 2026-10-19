const express = require('express');
const passport = require('passport');
const {
  register,
  login,
  logout,
  refreshToken,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
  changePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { userValidation, validate } = require('../middleware/validation');
const { sendTokenResponse, generateAccessToken, generateRefreshToken } = require('../utils/tokenUtils');

const router = express.Router();

// Local authentication routes
router.post('/register', userValidation.register, validate, register);
router.post('/login', userValidation.login, validate, login);
router.post('/logout', protect, logout);
router.post('/refresh-token', refreshToken);
router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, userValidation.updateProfile, validate, updateProfile);
router.put('/change-password', protect, changePassword);

// Helper function for OAuth redirect
const handleOAuthCallback = async (req, res) => {
  const user = req.user;
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Save refresh token
  user.refreshTokens.push({ token: refreshToken });
  await user.save({ validateBeforeSave: false });

  // Redirect to frontend with tokens
  // Use a temporary code or just tokens for simplicity in this dev environment
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  res.redirect(`${clientUrl}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);
};

// Google OAuth routes
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  handleOAuthCallback
);

// GitHub OAuth routes
router.get(
  '/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

router.get(
  '/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: '/login' }),
  handleOAuthCallback
);

module.exports = router;