const Message = require('../models/Message');
const Project = require('../models/Project');
const { AppError } = require('../middleware/errorHandler');

/**
 * @desc    Get messages for a project (Team Chat)
 * @route   GET /api/messages/project/:projectId
 * @access  Private
 */
exports.getProjectMessages = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const messages = await Message.find({ project: projectId })
      .populate('sender', 'name email avatar')
      .populate('replyTo')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: messages.length,
      messages: messages.reverse(), // Return oldest to newest for chat
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get direct messages between current user and another user
 * @route   GET /api/messages/direct/:userId
 * @access  Private
 */
exports.getDirectMessages = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, recipient: userId },
        { sender: userId, recipient: req.user._id },
      ],
    })
      .populate('sender', 'name email avatar')
      .populate('recipient', 'name email avatar')
      .populate('replyTo')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: messages.length,
      messages: messages.reverse(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send a message
 * @route   POST /api/messages
 * @access  Private
 */
exports.sendMessage = async (req, res, next) => {
  try {
    const { content, recipient, project, replyTo, attachments } = req.body;

    if (!recipient && !project) {
      return next(new AppError('Message must have a recipient or project', 400));
    }

    const message = await Message.create({
      sender: req.user._id,
      content,
      recipient,
      project,
      replyTo,
      attachments,
      readBy: [{ user: req.user._id }], // Sender has read it
    });

    await message.populate('sender', 'name email avatar');
    if (recipient) await message.populate('recipient', 'name email avatar');
    if (replyTo) await message.populate('replyTo');

    // Socket.io events
    if (req.io) {
      if (project) {
        req.io.to(`project:${project}`).emit('message:new', message);
      } else if (recipient) {
        req.io.to(`user:${recipient}`).emit('message:direct', message);
        req.io.to(`user:${req.user._id}`).emit('message:direct', message); // Also to sender (if multiple tabs)
      }
    }

    res.status(201).json({
      success: true,
      messageData: message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark messages as read
 * @route   PUT /api/messages/read
 * @access  Private
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const { messageIds } = req.body;

    await Message.updateMany(
      { _id: { $in: messageIds } },
      {
        $addToSet: {
          readBy: {
            user: req.user._id,
            readAt: new Date(),
          },
        },
      }
    );

    res.status(200).json({
      success: true,
      message: 'Messages marked as read',
    });
  } catch (error) {
    next(error);
  }
};
