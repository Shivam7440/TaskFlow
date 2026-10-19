const express = require('express');
const router = express.Router();
const { submitContactForm } = require('../controllers/contactController');

// Rate limiting: prevent spamming the contact form
const rateLimit = require('express-rate-limit');
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 contact requests per windowMs
  message: 'Too many contact requests from this IP, please try again after an hour'
});

router.post('/', contactLimiter, submitContactForm);

module.exports = router;
