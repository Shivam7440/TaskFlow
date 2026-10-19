const express = require('express');
const {
  getSprints,
  createSprint,
  updateSprint,
  deleteSprint,
  assignTasksToSprint
} = require('../controllers/sprintController');
const { protect } = require('../middleware/auth');
const { mongoIdValidation, validate } = require('../middleware/validation');

const router = express.Router();

// All sprint routes are protected
router.use(protect);

router.route('/')
  .get(getSprints)
  .post(createSprint);

router.route('/:id')
  .put(mongoIdValidation, validate, updateSprint)
  .delete(mongoIdValidation, validate, deleteSprint);

router.post('/:id/tasks', assignTasksToSprint);

module.exports = router;
