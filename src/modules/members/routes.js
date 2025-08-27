const express = require('express');
const router = express.Router();
const ctrl = require('./controller');
const { requireAuth } = require('../../middleware/auth');
const { requireBoardRole } = require('../../middleware/boardAccess');

// All routes require authentication
// router.use(requireAuth);

// Fetch all members of a board (OWNER+)
router.get('/', requireBoardRole('OWNER'), ctrl.listMembers);

// Add a member (OWNER+)
router.post('/:boardId', requireBoardRole('OWNER'), ctrl.addMember);

// Update a member's role (OWNER+)
router.put('/:boardId/:userId', requireBoardRole('OWNER'), ctrl.updateMemberRole);

// Remove a member (OWNER+)
router.delete('/:boardId/:userId', requireBoardRole('OWNER'), ctrl.removeMember);

module.exports = router;
