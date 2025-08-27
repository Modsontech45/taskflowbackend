const express = require('express');
const router = express.Router();
const ctrl = require('./controller');
const { requireAuth } = require('../../middleware/auth');
const { requireBoardRole } = require('../../middleware/boardAccess');
const { z } = require('zod');

// Middleware: Validate request body with Zod schema
function validate(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: parsed.error.flatten() 
      });
    }
    req.body = parsed.data;
    next();
  };
}

// All routes require authentication
// router.use(requireAuth);

// ===== BOARD ROUTES ===== //

// Create a new board
router.post(
  '/create',
  validate(z.object({ name: z.string().min(1) })),
  ctrl.createBoard
);

// List all boards where user is owner or member
router.get('/all', ctrl.listBoards);

// Get a single board (VIEWER+ permission required)
router.get('/:id', requireBoardRole('VIEWER'), ctrl.getBoard);

// Rename a board (OWNER only)
router.patch(
  '/:id',
  requireBoardRole('OWNER'),
  validate(z.object({ name: z.string().min(1) })),
  ctrl.renameBoard
);

// Delete a board (OWNER only)
router.delete('/:id', requireBoardRole('OWNER'), ctrl.deleteBoard);

// Share a board (OWNER can assign VIEWER or EDITOR)
router.post(
  '/:id/share',
  requireBoardRole('OWNER'),
  validate(z.object({ 
    email: z.string().email(), 
    role: z.enum(['VIEWER', 'EDITOR']) 
  })),
  ctrl.shareBoard
);

// List members of a board (VIEWER+ permission required)
router.get('/:id/members', requireBoardRole('VIEWER'), ctrl.listMembers);


// Remove a member from a board (OWNER only)
router.delete(
  '/:id/members/:memberId',
  requireBoardRole('OWNER'),
  ctrl.removeMember
);

// Change a member's role (OWNER only)
router.patch(
  '/:id/members/:memberId',
  requireBoardRole('OWNER'),
  validate(z.object({ role: z.enum(['VIEWER', 'EDITOR']) })),
  ctrl.changeMemberRole
);

module.exports = router;