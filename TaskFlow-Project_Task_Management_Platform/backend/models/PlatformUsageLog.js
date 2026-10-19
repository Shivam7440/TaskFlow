const mongoose = require('mongoose');

const platformUsageLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  hourlyData: {
    type: Map,
    of: Number, // key: hour (0-23), value: minutes
    default: {}
  }
}, { timestamps: true });

// Ensure one log per user per day
platformUsageLogSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('PlatformUsageLog', platformUsageLogSchema);
