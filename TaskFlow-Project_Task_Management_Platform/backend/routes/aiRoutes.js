const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

// All AI routes are protected
router.use(protect);

router.post('/meeting-to-tasks', aiController.convertNotesToTasks);
router.post('/rewrite-task', aiController.rewriteToUserStory);
router.post('/generate-kanban', aiController.generateKanbanStructure);
router.post('/create-project-with-kanban', aiController.createProjectWithKanban);
router.get('/insights/:workspaceId', aiController.getWorkspaceInsights);

module.exports = router;
