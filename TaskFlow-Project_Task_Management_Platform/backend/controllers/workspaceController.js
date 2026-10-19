const Workspace = require('../models/Workspace');
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');

/**
 * @desc    Get all workspaces for current user
 * @route   GET /api/workspaces
 * @access  Private
 */
exports.getWorkspaces = async (req, res, next) => {
  try {
    const workspaces = await Workspace.find({
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id },
      ],
    })
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: workspaces.length,
      workspaces,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single workspace
 * @route   GET /api/workspaces/:id
 * @access  Private
 */
exports.getWorkspace = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    if (!workspace) {
      return next(new AppError('Workspace not found', 404));
    }

    res.status(200).json({
      success: true,
      workspace,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new workspace
 * @route   POST /api/workspaces
 * @access  Private
 */
exports.createWorkspace = async (req, res, next) => {
  try {
    const { name, description, avatar } = req.body;

    const workspace = await Workspace.create({
      name,
      description,
      avatar,
      owner: req.user._id,
      members: [
        {
          user: req.user._id,
          role: 'admin',
        },
      ],
    });

    await workspace.populate('owner', 'name email avatar');

    res.status(201).json({
      success: true,
      message: 'Workspace created successfully',
      workspace,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update workspace
 * @route   PUT /api/workspaces/:id
 * @access  Private
 */
exports.updateWorkspace = async (req, res, next) => {
  try {
    let workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return next(new AppError('Workspace not found', 404));
    }

    // Check authorization - only owner can update
    if (workspace.owner.toString() !== req.user._id.toString()) {
      return next(new AppError('Not authorized to update this workspace', 403));
    }

    const { name, description, avatar } = req.body;

    if (name) workspace.name = name;
    if (description) workspace.description = description;
    if (avatar) workspace.avatar = avatar;

    workspace = await workspace.save();
    await workspace.populate('owner', 'name email avatar');

    res.json({
      success: true,
      message: 'Workspace updated successfully',
      workspace,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete workspace
 * @route   DELETE /api/workspaces/:id
 * @access  Private
 */
exports.deleteWorkspace = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return next(new AppError('Workspace not found', 404));
    }

    // Check authorization
    if (workspace.owner.toString() !== req.user._id.toString()) {
      return next(new AppError('Not authorized to delete this workspace', 403));
    }

    await Workspace.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Workspace deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Invite member to workspace
 * @route   POST /api/workspaces/:id/invite
 * @access  Private
 */
exports.inviteMember = async (req, res, next) => {
  try {
    const { email, role } = req.body;

    let workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return next(new AppError('Workspace not found', 404));
    }

    // Check authorization
    if (workspace.owner.toString() !== req.user._id.toString()) {
      return next(new AppError('Not authorized', 403));
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Check if already a member
    if (workspace.members.some(m => m.user.toString() === user._id.toString())) {
      return next(new AppError('User is already a member', 400));
    }

    workspace.members.push({
      user: user._id,
      role: role || 'member',
    });

    workspace = await workspace.save();
    await workspace.populate('members.user', 'name email avatar');

    res.json({
      success: true,
      message: 'Member invited successfully',
      workspace,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove member from workspace
 * @route   DELETE /api/workspaces/:id/members/:userId
 * @access  Private
 */
exports.removeMember = async (req, res, next) => {
  try {
    const { userId } = req.params;

    let workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return next(new AppError('Workspace not found', 404));
    }

    workspace.members = workspace.members.filter(m => m.user.toString() !== userId);

    workspace = await workspace.save();

    res.json({
      success: true,
      message: 'Member removed successfully',
      workspace,
    });
  } catch (error) {
    next(error);
  }
};
