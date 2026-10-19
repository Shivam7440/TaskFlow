const express = require('express');
const router = express.Router();
const {
  getComments,
  addComment,
  deleteComment,
} = require('../controllers/commentController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/task/:taskId', getComments);
router.post('/', addComment);
router.delete('/:id', deleteComment);

module.exports = router;
