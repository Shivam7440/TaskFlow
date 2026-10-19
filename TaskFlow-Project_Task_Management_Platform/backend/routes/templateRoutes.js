const express = require('express');
const {
  getTemplates,
  createTemplate,
  getTemplate,
  deleteTemplate,
} = require('../controllers/templateController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getTemplates)
  .post(createTemplate);

router.route('/:id')
  .get(getTemplate)
  .delete(deleteTemplate);

module.exports = router;
