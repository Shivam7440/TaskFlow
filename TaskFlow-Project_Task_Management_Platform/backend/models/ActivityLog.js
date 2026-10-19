const mongoose = require('mongoose');

/**
 * Activity Log Model Schema
 * Tracks all activities and changes in the system
 */
const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: [
        'create',
        'update',
        'delete',
        'move',
        'assign',
        'unassign',
        'comment',
        'upload',
        'complete',
        'reopen',
        'archive',
        'restore',
      ],
      required: true,
    },
    entityType: {
      type: String,
      enum: ['task', 'project', 'workspace', 'comment', 'file'],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    entityName: {
      type: String, // For display purposes
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
    },
    changes: {
      type: Map,
      of: mongoose.Schema.Types.Mixed, // Stores before/after values
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed, // Additional contextual data
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ workspace: 1, createdAt: -1 });
activityLogSchema.index({ project: 1, createdAt: -1 });
activityLogSchema.index({ task: 1, createdAt: -1 });
activityLogSchema.index({ entityType: 1, entityId: 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);