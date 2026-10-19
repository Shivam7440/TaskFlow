const mongoose = require('mongoose');

/**
 * Label Model Schema
 * Represents labels/tags that can be applied to tasks
 */
const labelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Label name is required'],
      trim: true,
      maxlength: [50, 'Label name cannot exceed 50 characters'],
    },
    color: {
      type: String,
      required: [true, 'Label color is required'],
      default: '#6366f1',
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Ensure unique label names within a project
labelSchema.index({ name: 1, project: 1 }, { unique: true });

module.exports = mongoose.model('Label', labelSchema);
