const express = require('express');
const router = express.Router();
const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
  updateMemberRole,
  respondToInvitation,
  transferOwnership,
  requestEditAccess
} = require('../controllers/projectController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getProjects)
  .post(createProject);

router.route('/:id')
  .get(getProject)
  .put(updateProject)
  .delete(deleteProject);

router.route('/:id/members')
  .post(addMember);

router.route('/:id/members/:userId')
  .delete(removeMember);

router.route('/:id/members/:userId/role')
  .put(updateMemberRole);

router.route('/:id/request-access')
  .post(requestEditAccess);

router.route('/:id/invitation')
  .post(respondToInvitation);

router.route('/:id/transfer-ownership')
  .put(transferOwnership);

module.exports = router;
