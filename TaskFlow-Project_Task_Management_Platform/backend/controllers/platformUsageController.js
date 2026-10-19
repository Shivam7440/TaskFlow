const PlatformUsageLog = require('../models/PlatformUsageLog');

/**
 * Platform Usage Controller
 * Tracks how long users spend on the platform per day, broken down by hour.
 */

/**
 * @desc    Log platform usage time (increment minutes for a given hour)
 * @route   POST /api/platform-usage/log
 * @access  Private
 */
exports.logUsage = async (req, res, next) => {
  try {
    const { date, hour, minutes } = req.body;

    if (!date || hour === undefined || !minutes) {
      return res.status(400).json({ success: false, message: 'date, hour, and minutes are required' });
    }

    const hourKey = String(hour);

    const log = await PlatformUsageLog.findOneAndUpdate(
      { user: req.user._id, date },
      { $inc: { [`hourlyData.${hourKey}`]: minutes } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({ success: true, data: log });
  } catch (err) {
    console.error('Error logging platform usage:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Get platform usage for a specific date
 * @route   GET /api/platform-usage?date=YYYY-MM-DD
 * @access  Private
 */
exports.getUsage = async (req, res, next) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ success: false, message: 'date query parameter is required' });
    }

    const log = await PlatformUsageLog.findOne({ user: req.user._id, date });

    if (!log) {
      // Return an empty hourlyData map if no log exists yet
      return res.status(200).json({
        success: true,
        data: { user: req.user._id, date, hourlyData: {} }
      });
    }

    return res.status(200).json({ success: true, data: log });
  } catch (err) {
    console.error('Error fetching platform usage:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
