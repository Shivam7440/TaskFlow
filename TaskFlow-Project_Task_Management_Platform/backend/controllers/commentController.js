const Comment = require('../models/Comment');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const { AppError } = require('../middleware/errorHandler');

/**
 * @desc    Get comments for a task
 * @route   GET /api/comments/task/:taskId
 * @access  Private
 */
exports.getComments = async (req, res, next) => {
  try {
    const comments = await Comment.find({ task: req.params.taskId })
      .populate('author', 'name email avatar')
      .populate('mentions', 'name email avatar')
      .sort({ createdAt: 1 }); // Oldest first

    res.status(200).json({
      success: true,
      count: comments.length,
      comments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add a comment
 * @route   POST /api/comments
 * @access  Private
 */
exports.addComment = async (req, res, next) => {
  try {
    const { content, taskId, mentions, parentComment, attachments } = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
      return next(new AppError('Task not found', 404));
    }

    const comment = await Comment.create({
      content,
      task: taskId,
      author: req.user._id,
      mentions,
      parentComment,
      attachments,
    });

    await comment.populate('author', 'name email avatar');
    await comment.populate('mentions', 'name email avatar');

    // Create notifications for mentions
    if (mentions && mentions.length > 0) {
      const notifications = mentions.map((userId) => ({
        recipient: userId,
        sender: req.user._id,
        type: 'comment-mentioned',
        title: 'You were mentioned in a comment',
        message: `${req.user.name} mentioned you in task "${task.title}"`,
        link: `/tasks/${taskId}`,
        relatedTask: taskId,
        relatedProject: task.project,
      }));
      const inserted = await Notification.insertMany(notifications);
      if (req.io) {
        inserted.forEach((notif) => {
          req.io.to(`user:${notif.recipient}`).emit('notification:new', notif);
        });
      }
    } 
    // Create notification for task owner if not the one commenting
    else if (task.reporter.toString() !== req.user._id.toString()) {
       const notification = await Notification.create({
        recipient: task.reporter,
        sender: req.user._id,
        type: 'comment-added',
        title: 'New comment on your task',
        message: `${req.user.name} commented on "${task.title}"`,
        link: `/tasks/${taskId}`,
        relatedTask: taskId,
        relatedProject: task.project,
       });
       if (req.io) {
         req.io.to(`user:${task.reporter}`).emit('notification:new', notification);
       }
    }

    // Emit socket event
    if (req.io) {
      req.io.to(`project:${task.project}`).emit('comment:added', comment);
    }

    res.status(201).json({
      success: true,
      comment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete comment
 * @route   DELETE /api/comments/:id
 * @access  Private
 */
exports.deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return next(new AppError('Comment not found', 404));
    }

    // Check authorization
    if (comment.author.toString() !== req.user._id.toString()) {
      return next(new AppError('Not authorized to delete this comment', 403));
    }

    // Soft delete
    comment.isDeleted = true;
    await comment.save();

    // Fetch task to get project ID for socket event
    const task = await Task.findById(comment.task);

    if (req.io && task) {
        req.io.to(`project:${task.project}`).emit('comment:deleted', { commentId: comment._id });
    }

    res.status(200).json({
      success: true,
      message: 'Comment deleted',
    });
  } catch (error) {
    next(error);
  }
};
