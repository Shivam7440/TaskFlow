const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Document title is required'],
    trim: true,
  },
  content: {
    type: String,
    required: [true, 'Document content is required'],
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['wiki', 'meeting-note', 'documentation'],
    default: 'wiki',
  },
  relatedTasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
  }],
}, { timestamps: true });

documentSchema.index({ project: 1, type: 1 });
documentSchema.index({ title: 'text', content: 'text' });

module.exports = mongoose.model('Document', documentSchema);
