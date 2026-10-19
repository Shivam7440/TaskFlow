const Sprint = require('../models/Sprint');
const Task = require('../models/Task');
const Workspace = require('../models/Workspace');

/**
 * Sprint Controller
 * Handles all operations related to Scrum Sprints and Cycles
 */

// @desc    Get all sprints for a workspace
// @route   GET /api/sprints?workspace=:workspaceId
// @access  Private
exports.getSprints = async (req, res, next) => {
  try {
    const { workspace } = req.query;
    if (!workspace) {
      return res.status(400).json({ success: false, message: 'Workspace ID query parameter is required' });
    }

    const sprints = await Sprint.find({ workspace }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: sprints.length,
      sprints
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new planned sprint
// @route   POST /api/sprints
// @access  Private
exports.createSprint = async (req, res, next) => {
  try {
    const { name, goal, startDate, endDate, workspace } = req.body;
    
    if (!name || !workspace) {
      return res.status(400).json({ success: false, message: 'Sprint name and Workspace ID are required' });
    }

    const sprint = await Sprint.create({
      name,
      goal,
      startDate,
      endDate,
      workspace,
      status: 'planned'
    });

    res.status(201).json({
      success: true,
      sprint
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a sprint (activate, complete, or edit details)
// @route   PUT /api/sprints/:id
// @access  Private
exports.updateSprint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, goal, startDate, endDate, status } = req.body;

    let sprint = await Sprint.findById(id);
    if (!sprint) {
      return res.status(404).json({ success: false, message: 'Sprint not found' });
    }

    // Handle lifecycle changes
    if (status && status !== sprint.status) {
      if (status === 'active') {
        // Activate sprint
        sprint.startDate = startDate || new Date();
        sprint.status = 'active';
      } else if (status === 'completed') {
        // Complete sprint
        sprint.completedAt = new Date();
        sprint.status = 'completed';

        // Move all incomplete tasks to backlog (sprint = null)
        await Task.updateMany(
          { sprint: id, status: { $ne: 'completed' } },
          { $set: { sprint: null } }
        );
      } else {
        sprint.status = status;
      }
    }

    if (name) sprint.name = name;
    if (goal) sprint.goal = goal;
    if (startDate && sprint.status !== 'active') sprint.startDate = startDate;
    if (endDate) sprint.endDate = endDate;

    await sprint.save();

    res.status(200).json({
      success: true,
      sprint
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a sprint
// @route   DELETE /api/sprints/:id
// @access  Private
exports.deleteSprint = async (req, res, next) => {
  try {
    const { id } = req.params;

    const sprint = await Sprint.findById(id);
    if (!sprint) {
      return res.status(404).json({ success: false, message: 'Sprint not found' });
    }

    // Set all tasks linked to this sprint back to the backlog
    await Task.updateMany({ sprint: id }, { $set: { sprint: null } });

    await sprint.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Sprint deleted and tasks returned to backlog'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk assign tasks to a sprint
// @route   POST /api/sprints/:id/tasks
// @access  Private
exports.assignTasksToSprint = async (req, res, next) => {
  try {
    const { id } = req.params; // sprint ID. Use 'backlog' to return to backlog.
    const { taskIds } = req.body; // array of task IDs

    if (!taskIds || !Array.isArray(taskIds)) {
      return res.status(400).json({ success: false, message: 'taskIds must be a valid array' });
    }

    const targetSprintId = id === 'backlog' ? null : id;

    if (targetSprintId) {
      const sprint = await Sprint.findById(targetSprintId);
      if (!sprint) {
        return res.status(404).json({ success: false, message: 'Sprint not found' });
      }
    }

    await Task.updateMany(
      { _id: { $in: taskIds } },
      { $set: { sprint: targetSprintId } }
    );

    res.status(200).json({
      success: true,
      message: `Successfully moved ${taskIds.length} tasks to ${id === 'backlog' ? 'backlog' : 'sprint'}`
    });
  } catch (error) {
    next(error);
  }
};
