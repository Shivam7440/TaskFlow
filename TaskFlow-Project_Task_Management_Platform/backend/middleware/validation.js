const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation middleware using express-validator
 * Provides reusable validation rules for different routes
 */

// Middleware to check validation results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((err) => ({
        field: err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

// User validation rules
const userValidation = {
  register: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ max: 100 })
      .withMessage('Name cannot exceed 100 characters'),
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  login: [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  updateProfile: [
    body('name')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Name cannot exceed 100 characters'),
    body('email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
  ],
};

// Workspace validation rules
const workspaceValidation = {
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Workspace name is required')
      .isLength({ max: 100 })
      .withMessage('Workspace name cannot exceed 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
  ],
  update: [
    body('name')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Workspace name cannot exceed 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
  ],
};

// Project validation rules
const projectValidation = {
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Project name is required')
      .isLength({ max: 100 })
      .withMessage('Project name cannot exceed 100 characters'),
    body('workspace')
      .notEmpty()
      .withMessage('Workspace is required')
      .isMongoId()
      .withMessage('Invalid workspace ID'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description cannot exceed 1000 characters'),
  ],
  update: [
    body('name')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Project name cannot exceed 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description cannot exceed 1000 characters'),
  ],
};

// Task validation rules
const taskValidation = {
  create: [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Task title is required')
      .isLength({ max: 200 })
      .withMessage('Title cannot exceed 200 characters'),
    body('project')
      .notEmpty()
      .withMessage('Project is required')
      .isMongoId()
      .withMessage('Invalid project ID'),
    body('column').notEmpty().withMessage('Column is required'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 5000 })
      .withMessage('Description cannot exceed 5000 characters'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Invalid priority value'),
  ],
  update: [
    body('title')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Title cannot exceed 200 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 5000 })
      .withMessage('Description cannot exceed 5000 characters'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Invalid priority value'),
    body('status')
      .optional()
      .isIn(['todo', 'in-progress', 'review', 'completed', 'blocked'])
      .withMessage('Invalid status value'),
  ],
};

// Comment validation rules
const commentValidation = {
  create: [
    body('content')
      .trim()
      .notEmpty()
      .withMessage('Comment content is required')
      .isLength({ max: 2000 })
      .withMessage('Comment cannot exceed 2000 characters'),
    body('task')
      .notEmpty()
      .withMessage('Task is required')
      .isMongoId()
      .withMessage('Invalid task ID'),
  ],
};

// MongoDB ID validation
const mongoIdValidation = [
  param('id').isMongoId().withMessage('Invalid ID format'),
];

module.exports = {
  validate,
  userValidation,
  workspaceValidation,
  projectValidation,
  taskValidation,
  commentValidation,
  mongoIdValidation,
};