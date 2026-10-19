const Task = require('../models/Task');
const Project = require('../models/Project');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
// Ensure Label model is registered for populate
require('../models/Label');
const { AppError } = require('../middleware/errorHandler');
const { checkProjectPermission } = require('../utils/permissionUtils');

/**
 * Task Controller
 * Handles all task-related operations
 */

/**
 * @desc    Get all tasks for a project
 * @route   GET /api/tasks?project=:projectId
 * @access  Private
 */
exports.getTasks = async (req, res, next) => {
  try {
    const { project, status, priority, assignee, search, column } = req.query;

    // Build query
    const query = { isArchived: false };
    
    if (project) {
      const projectDoc = await Project.findOne({
        _id: project,
        $or: [
          { owner: req.user._id },
          { 'members.user': req.user._id }
        ]
      });

      if (!projectDoc) {
        return res.status(200).json({
          success: true,
          count: 0,
          tasks: []
        });
      }
      query.project = project;
    } else {
      // If no project specified (e.g. dashboard), get tasks from all projects user is part of
      const userProjects = await Project.find({
        $or: [
          { owner: req.user._id },
          { 'members.user': req.user._id }
        ]
      }).select('_id');
      
      const projectIds = userProjects.map(p => p._id);
      
      // Fetch tasks that are either in the user's projects, or are project-less personal todos
      query.$or = [
        { project: { $in: projectIds } },
        { project: null, reporter: req.user._id },
        { project: null, assignees: req.user._id }
      ];
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignee) query.assignees = assignee;
    if (column) query.column = column;
    if (search) {
      query.$text = { $search: search };
    }

    const tasks = await Task.find(query)
      .populate('assignees', 'name email avatar')
      .populate('reporter', 'name email avatar')
      .populate('labels')
      .sort({ order: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single task by ID
 * @route   GET /api/tasks/:id
 * @access  Private
 */
exports.getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignees', 'name email avatar')
      .populate('reporter', 'name email avatar')
      .populate('labels')
      .populate('project', 'name workspace')
      .populate('parentTask', 'title')
      .populate('subtasks', 'title status');

    if (!task) {
      return next(new AppError('Task not found', 404));
    }

    res.status(200).json({
      success: true,
      task,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new task
 * @route   POST /api/tasks
 * @access  Private
 */


/**
 * @desc    Create new task
 * @route   POST /api/tasks
 * @access  Private
 */
exports.createTask = async (req, res, next) => {
  try {
    const {
      title,
      description,
      project,
      column,
      assignees,
      priority,
      dueDate,
      labels,
      checklist,
      parentTask,
    } = req.body;

    // If project is provided, verify it exists and check permissions
    if (project) {
      const projectDoc = await Project.findById(project);
      if (!projectDoc) {
        return next(new AppError('Project not found', 404));
      }

      // Check permission - Editor access required
      if (!checkProjectPermission(projectDoc, req.user._id, 'editor')) {
          return next(new AppError('Not authorized to create tasks in this project', 403));
      }
    }

    // Get the highest order in the column
    const lastTask = await Task.findOne({ project, column })
      .sort({ order: -1 })
      .select('order');
    const order = lastTask ? lastTask.order + 1 : 0;

    // Create task
    const task = await Task.create({
      title,
      description,
      project,
      column,
      order,
      assignees: assignees || [],
      reporter: req.user._id,
      priority: priority || 'medium',
      dueDate,
      labels: labels || [],
      checklist: checklist || [],
      parentTask,
    });

    // Populate task
    await task.populate('assignees', 'name email avatar');
    await task.populate('reporter', 'name email avatar');

    // Create activity log
    await ActivityLog.create({
      user: req.user._id,
      action: 'create',
      entityType: 'task',
      entityId: task._id,
      entityName: task.title,
      project: task.project,
      task: task._id,
    });

    // Create notifications for assignees
    if (assignees && assignees.length > 0) {
      const notifications = assignees.map((assigneeId) => ({
        recipient: assigneeId,
        sender: req.user._id,
        type: 'task-assigned',
        title: 'New Task Assigned',
        message: `You have been assigned to "${title}"`,
        link: `/tasks/${task._id}`,
        relatedTask: task._id,
        relatedProject: project,
      }));
      const inserted = await Notification.insertMany(notifications);
      if (req.io) {
        inserted.forEach((notif) => {
          req.io.to(`user:${notif.recipient}`).emit('notification:new', notif);
        });
      }
    }

    // Emit socket event (to be handled by socket.io)
    if (req.io) {
      req.io.to(`project:${project}`).emit('task:created', task);
    }

    res.status(201).json({
      success: true,
      task,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update task
 * @route   PUT /api/tasks/:id
 * @access  Private
 */
exports.updateTask = async (req, res, next) => {
  try {
    let task = await Task.findById(req.params.id).populate('project');

    if (!task) {
      return next(new AppError('Task not found', 404));
    }

    // Check permission - Editor access required
    // Need to fetch full project details including members to check perms
    const projectDoc = await Project.findById(task.project._id || task.project);
    if (!checkProjectPermission(projectDoc, req.user._id, 'editor')) {
        return next(new AppError('Not authorized to update tasks in this project', 403));
    }

    // Track changes for activity log
    const changes = new Map();
    const allowedFields = [
      'title',
      'description',
      'column',
      'priority',
      'status',
      'dueDate',
      'startDate',
      'estimatedTime',
      'assignees',
      'labels',
      'checklist',
      'customFields',
      'attachments',
    ];

    allowedFields.forEach((field) => {
        // Simple comparison, might need deep compare for objects/arrays
      if (req.body[field] !== undefined && JSON.stringify(req.body[field]) !== JSON.stringify(task[field])) {
        changes.set(field, {
          before: task[field],
          after: req.body[field],
        });
      }
    });

    // Update task
    task = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('assignees', 'name email avatar')
      .populate('reporter', 'name email avatar')
      .populate('labels');

    // Create activity log
    if (changes.size > 0) {
      await ActivityLog.create({
        user: req.user._id,
        action: 'update',
        entityType: 'task',
        entityId: task._id,
        entityName: task.title,
        project: task.project,
        task: task._id,
        changes: Object.fromEntries(changes),
      });
    }

    // Emit socket event
    if (req.io) {
      req.io.to(`project:${task.project}`).emit('task:updated', task);
    }

    res.status(200).json({
      success: true,
      task,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete task
 * @route   DELETE /api/tasks/:id
 * @access  Private
 */
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return next(new AppError('Task not found', 404));
    }

    // Check permission - Admin or Reporter (Owner of the task) required
    const projectDoc = await Project.findById(task.project);
    const isAdmin = checkProjectPermission(projectDoc, req.user._id, 'admin');
    const isReporter = task.reporter.toString() === req.user._id.toString();

    if (!isAdmin && !isReporter) {
        return next(new AppError('Not authorized to delete this task', 403));
    }

    await task.deleteOne();

    // Create activity log
    await ActivityLog.create({
      user: req.user._id,
      action: 'delete',
      entityType: 'task',
      entityId: task._id,
      entityName: task.title,
      project: task.project,
    });

    // Emit socket event
    if (req.io) {
      req.io.to(`project:${task.project}`).emit('task:deleted', { id: task._id });
    }

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Move task to different column
 * @route   PUT /api/tasks/:id/move
 * @access  Private
 */
exports.moveTask = async (req, res, next) => {
  try {
    const { column, order } = req.body;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return next(new AppError('Task not found', 404));
    }

    // Check permission - Editor required
    const projectDoc = await Project.findById(task.project);
    if (!checkProjectPermission(projectDoc, req.user._id, 'editor')) {
        return next(new AppError('Not authorized to move tasks', 403));
    }

    const oldColumn = task.column;
    task.column = column;
    task.order = order;
    await task.save();

    // Update order of other tasks in the column
    await Task.updateMany(
      { project: task.project, column, _id: { $ne: task._id }, order: { $gte: order } },
      { $inc: { order: 1 } }
    );

    // Create activity log
    await ActivityLog.create({
      user: req.user._id,
      action: 'move',
      entityType: 'task',
      entityId: task._id,
      entityName: task.title,
      project: task.project,
      task: task._id,
      changes: {
        column: { before: oldColumn, after: column },
      },
    });

    // Emit socket event
    if (req.io) {
      req.io.to(`project:${task.project}`).emit('task:moved', task);
    }

    res.status(200).json({
      success: true,
      task,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add attachment to task
 * @route   POST /api/tasks/:id/attachments
 * @access  Private
 */
exports.addAttachment = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('Please upload a file', 400));
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return next(new AppError('Task not found', 404));
    }

    // Check permission - Editor required
    const projectDoc = await Project.findById(task.project);
    if (!checkProjectPermission(projectDoc, req.user._id, 'editor')) {
        return next(new AppError('Not authorized to add attachments', 403));
    }

    const attachment = {
      name: req.file.originalname,
      url: `/uploads/${req.file.filename}`,
      size: req.file.size,
      mimeType: req.file.mimetype,
      uploadedBy: req.user._id,
    };

    task.attachments.push(attachment);
    await task.save();

    // Create activity log
    await ActivityLog.create({
      user: req.user._id,
      action: 'upload',
      entityType: 'file',
      entityId: task._id,
      entityName: req.file.originalname,
      project: task.project,
      task: task._id,
    });

    // Emit socket event
    if (req.io) {
      req.io.to(`project:${task.project}`).emit('task:attachment-added', {
        taskId: task._id,
        attachment,
      });
    }

    res.status(200).json({
      success: true,
      attachment,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;