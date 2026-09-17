const express = require('express');
const router = express.Router();
const ctrl = require('./controller');
const commentCtrl = require('./commentsController');
const { requireBoardRole } = require('../../middleware/boardAccess');
const { z } = require('zod');

// ===== Middleware: Validate request body using Zod =====
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      message: 'Validation error',
      errors: result.error.flatten(),
    });
  }
  req.body = result.data;
  next();
};

// ===== Task Schemas =====
const PRIORITY = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional();

const createTaskSchema = z.object({
  title: z.string().min(1),
  notes: z.string().optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  priority: PRIORITY,
  assigneeId: z.string().uuid().optional().nullable(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  notes: z.string().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  isDone: z.boolean().optional(),
  priority: PRIORITY,
  assigneeId: z.string().uuid().optional().nullable(),
});

// ===== Routes =====

// Create Task (EDITOR+)
router.post(
  '/boards/:boardId/tasks',
  requireBoardRole('EDITOR'),
  validate(createTaskSchema),
  ctrl.createTask
);

// List Tasks (VIEWER+)
router.get(
  '/boards/:boardId/tasks',
  requireBoardRole('VIEWER'),
  ctrl.listTasks
);

// Update Task (EDITOR+)
router.patch(
  '/boards/:boardId/tasks/:id',
  requireBoardRole('EDITOR'),
  validate(updateTaskSchema),
  ctrl.updateTask
);

// Full Update Task (PUT) (EDITOR+)
router.put(
  '/boards/:boardId/tasks/:id',
  requireBoardRole('EDITOR'),
  validate(updateTaskSchema),
  ctrl.updateTask
);

// Delete Task (EDITOR+)
router.delete(
  '/boards/:boardId/tasks/:id',
  requireBoardRole('EDITOR'),
  ctrl.deleteTask
);

// Toggle / Checkout Task (EDITOR+)
router.patch(
  '/boards/:boardId/tasks/:id/toggle',
  requireBoardRole('EDITOR'),
  ctrl.toggleTask
);

// ===== Comments =====
router.get('/boards/:boardId/tasks/:taskId/comments', requireBoardRole('VIEWER'), commentCtrl.getComments);
router.post('/boards/:boardId/tasks/:taskId/comments', requireBoardRole('VIEWER'), commentCtrl.addComment);
router.delete('/boards/:boardId/tasks/:taskId/comments/:commentId', requireBoardRole('VIEWER'), commentCtrl.deleteComment);

module.exports = router;
