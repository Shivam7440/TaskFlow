const mongoose = require('mongoose');

/**
 * Sprint Model Schema
 * Represents a Scrum Sprint / Cycle within a workspace
 */
const sprintSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Sprint name is required'],
      trim: true,
      maxlength: [100, 'Sprint name cannot exceed 100 characters'],
    },
    goal: {
      type: String,
      maxlength: [1000, 'Sprint goal cannot exceed 1000 characters'],
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['planned', 'active', 'completed'],
      default: 'planned',
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: [true, 'Sprint must belong to a workspace'],
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
sprintSchema.index({ workspace: 1, status: 1 });

module.exports = mongoose.model('Sprint', sprintSchema);
