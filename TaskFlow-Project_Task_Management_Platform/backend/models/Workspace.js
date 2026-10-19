const mongoose = require('mongoose');

/**
 * Workspace Model Schema
 * Represents a team workspace that contains projects and members
 */
const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Workspace name is required'],
      trim: true,
      maxlength: [100, 'Workspace name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
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
          enum: ['admin', 'manager', 'member', 'guest'],
          default: 'member',
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    settings: {
      visibility: {
        type: String,
        enum: ['private', 'team', 'public'],
        default: 'private',
      },
      allowInvites: {
        type: Boolean,
        default: true,
      },
      defaultProjectVisibility: {
        type: String,
        enum: ['private', 'workspace', 'public'],
        default: 'workspace',
      },
    },
    avatar: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for workspace searches
workspaceSchema.index({ name: 'text', description: 'text' });
// slug is already indexed due to unique: true constraint
workspaceSchema.index({ owner: 1 });
workspaceSchema.index({ 'members.user': 1 });

// Generate slug from name before saving
workspaceSchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

// Method to check if user is a member
workspaceSchema.methods.isMember = function (userId) {
  return this.members.some(
    (member) => member.user.toString() === userId.toString()
  );
};

// Method to get user role
workspaceSchema.methods.getUserRole = function (userId) {
  const member = this.members.find(
    (m) => m.user.toString() === userId.toString()
  );
  return member ? member.role : null;
};

module.exports = mongoose.model('Workspace', workspaceSchema);