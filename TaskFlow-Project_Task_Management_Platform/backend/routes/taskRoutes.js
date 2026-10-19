const express = require('express');
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  moveTask,
  addAttachment,
} = require('../controllers/taskController');
const { protect } = require('../middleware/auth');
const { taskValidation, validate, mongoIdValidation } = require('../middleware/validation');
const { upload, handleMulterError } = require('../middleware/upload');

const router = express.Router();

// All routes are protected
router.use(protect);

router.route('/')
  .get(getTasks)
  .post(taskValidation.create, validate, createTask);

router.route('/:id')
  .get(mongoIdValidation, validate, getTask)
  .put(mongoIdValidation, taskValidation.update, validate, updateTask)
  .delete(mongoIdValidation, validate, deleteTask);

router.put('/:id/move', mongoIdValidation, validate, moveTask);

router.post(
  '/:id/attachments',
  mongoIdValidation,
  validate,
  upload.single('file'),
  handleMulterError,
  addAttachment
);

module.exports = router;