const prisma = require('../config/prisma');
const { hasRoleOrAbove } = require('../utils/roles');

function requireBoardRole(minRole) {
  return async (req, res, next) => {
    const boardId = req.params.boardId || req.params.id;
    if (!boardId) return res.status(400).json({ message: 'Missing board id' });

    // Owner or membership
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { ownerId: true, members: { where: { userId: req.user.id }, select: { role: true } } }
    });
    if (!board) return res.status(404).json({ message: 'Board not found' });

    const effectiveRole = board.ownerId === req.user.id
      ? 'OWNER'
      : board.members[0]?.role || null;

    if (!effectiveRole || !hasRoleOrAbove(effectiveRole, minRole)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    req.boardRole = effectiveRole;
    next();
  };
}

module.exports = { requireBoardRole };
