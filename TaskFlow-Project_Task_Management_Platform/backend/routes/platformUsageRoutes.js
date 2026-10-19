const express = require('express');
const { logUsage, getUsage } = require('../controllers/platformUsageController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.post('/log', protect, logUsage);
router.get('/', protect, getUsage);

module.exports = router;
