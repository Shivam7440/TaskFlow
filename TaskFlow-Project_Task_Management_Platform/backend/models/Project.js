const mongoose = require('mongoose');

/**
 * Project Model Schema
 * Represents a project/board within a workspace
 */
const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [100, 'Project name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        role: {
          type: String,
          enum: ['editor', 'viewer'], // Only these roles for members. Owner is Admin.
          default: 'editor',
        },
        status: {
          type: String,
          enum: ['pending', 'active', 'declined'],
          default: 'pending',
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    color: {
      type: String,
      default: '#3B82F6', // Blue
    },
    icon: {
      type: String,
      default: '📋',
    },
    columns: [
      {
        columnId: {
          type: String,
          default: () => new mongoose.Types.ObjectId().toString(), // Generate a unique ID for each column
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        order: {
          type: Number,
          required: true,
        },
        color: {
          type: String,
          default: '#94A3B8',
        },
      },
    ],
    labels: [
      {
        name: {
          type: String,
          required: true,
        },
        color: {
          type: String,
          required: true,
        },
      },
    ],
    customFields: [
      {
        name: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: ['text', 'number', 'date', 'dropdown', 'checkbox', 'formula'],
          required: true,
        },
        options: [String], // For dropdown type
        required: {
          type: Boolean,
          default: false,
        },
        defaultValue: mongoose.Schema.Types.Mixed,
      },
    ],
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Template',
      default: null,
    },
    settings: {
      visibility: {
        type: String,
        enum: ['private', 'workspace', 'public'],
        default: 'workspace',
      },
      allowComments: {
        type: Boolean,
        default: true,
      },
      requireApproval: {
        type: Boolean,
        default: false,
      },
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
      enum: ['active', 'archived', 'completed', 'on-hold'],
      default: 'active',
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
projectSchema.index({ name: 'text', description: 'text' });
projectSchema.index({ workspace: 1, status: 1 });
projectSchema.index({ owner: 1 });
projectSchema.index({ 'members.user': 1 });

// Clean up members array BEFORE validation runs
// This removes the owner from members (stale data from old schema)
// and prevents 'admin is not a valid enum' errors
projectSchema.pre('validate', function (next) {
  if (this.owner && this.members && this.members.length > 0) {
    const ownerId = this.owner._id ? this.owner._id.toString() : this.owner.toString();
    this.members = this.members.filter(m => {
      const memberId = m.user._id ? m.user._id.toString() : m.user.toString();
      return memberId !== ownerId;
    });
  }
  next();
});

// Default columns for new projects
projectSchema.pre('save', function (next) {
  if (this.isNew && this.columns.length === 0) {
    this.columns = [
      { columnId: 'col_todo', name: 'To Do', order: 0, color: '#94A3B8' },
      { columnId: 'col_in_progress', name: 'In Progress', order: 1, color: '#3B82F6' },
      { columnId: 'col_review', name: 'Review', order: 2, color: '#F59E0B' },
      { columnId: 'col_completed', name: 'Completed', order: 3, color: '#10B981' },
    ];
  }
  
  // Ensure all columns have unique columnIds
  this.columns.forEach((col, idx) => {
    if (!col.columnId) {
      col.columnId = `col_${idx}_${Date.now()}`;
    }
  });
  
  next();
});

module.exports = mongoose.model('Project', projectSchema);