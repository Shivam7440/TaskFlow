const mongoose = require('mongoose');

/**
 * Template Model Schema
 * Represents reusable project and task templates
 */
const templateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    category: {
      type: String,
      enum: [
        'software-development',
        'marketing',
        'design',
        'hr',
        'sales',
        'product',
        'operations',
        'custom',
      ],
      default: 'custom',
    },
    type: {
      type: String,
      enum: ['project', 'task'],
      required: true,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    thumbnail: {
      type: String,
    },
    structure: {
      // For project templates
      columns: [
        {
          name: String,
          order: Number,
          color: String,
        },
      ],
      labels: [
        {
          name: String,
          color: String,
        },
      ],
      customFields: [
        {
          name: String,
          type: String,
          options: [String],
          required: Boolean,
        },
      ],
      // For task templates
      defaultTitle: String,
      defaultDescription: String,
      defaultPriority: String,
      defaultChecklist: [String],
    },
    usageCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
templateSchema.index({ name: 'text', description: 'text' });
templateSchema.index({ category: 1, isPublic: 1 });
templateSchema.index({ creator: 1 });

module.exports = mongoose.model('Template', templateSchema);