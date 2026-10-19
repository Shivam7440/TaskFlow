const mongoose = require('mongoose');

/**
 * Task Model Schema
 * Represents individual tasks/cards within a project
 */
const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: false,
    },
    column: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    assignees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['todo', 'in-progress', 'review', 'completed', 'blocked'],
      default: 'todo',
    },
    labels: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Label',
      },
    ],
    dueDate: {
      type: Date,
      default: null,
    },
    startDate: {
      type: Date,
      default: null,
    },
    estimatedTime: {
      type: Number, // In minutes
      default: null,
    },
    actualTime: {
      type: Number, // In minutes
      default: 0,
    },
    checklist: [
      {
        text: {
          type: String,
          required: true,
        },
        completed: {
          type: Boolean,
          default: false,
        },
        order: {
          type: Number,
          default: 0,
        },
      },
    ],
    attachments: [
      {
        name: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        size: {
          type: Number, // In bytes
        },
        mimeType: {
          type: String,
        },
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    customFields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    sprint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sprint',
      default: null,
    },
    parentTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },
    subtasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
      },
    ],
    dependencies: [
      {
        task: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Task',
        },
        type: {
          type: String,
          enum: ['blocks', 'is-blocked-by', 'relates-to'],
        },
      },
    ],
    watchers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    completedAt: {
      type: Date,
      default: null,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
taskSchema.index({ project: 1, column: 1, order: 1 });
taskSchema.index({ title: 'text', description: 'text' });
taskSchema.index({ assignees: 1 });
taskSchema.index({ reporter: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ status: 1, priority: 1 });

// Virtual for checklist progress
taskSchema.virtual('checklistProgress').get(function () {
  if (!this.checklist || this.checklist.length === 0) return 0;
  const completed = this.checklist.filter((item) => item.completed).length;
  return Math.round((completed / this.checklist.length) * 100);
});

// Update completedAt when status changes to completed
taskSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    if (this.status === 'completed' && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status !== 'completed' && this.completedAt) {
      this.completedAt = null;
    }
  }
  next();
});

module.exports = mongoose.model('Task', taskSchema);