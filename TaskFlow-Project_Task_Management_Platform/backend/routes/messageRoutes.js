const express = require('express');
const router = express.Router();
const {
  getProjectMessages,
  getDirectMessages,
  sendMessage,
  markAsRead,
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/project/:projectId', getProjectMessages);
router.get('/direct/:userId', getDirectMessages);
router.post('/', sendMessage);
router.put('/read', markAsRead);

module.exports = router;
