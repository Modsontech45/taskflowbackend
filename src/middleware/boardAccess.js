
const { hasRoleOrAbove } = require('../utils/roles');
const pool = require('../config/db');

function requireBoardRole(minRole) {
  return async (req, res, next) => {
    const boardId = req.params.boardId || req.params.id;
    if (!boardId) return res.status(400).json({ message: 'Missing board id' });

    try {
      // Fetch ownerId and membership role for the current user
      const result = await pool.query(
        `SELECT b."ownerId", bm.role
         FROM "Board" b
         LEFT JOIN "BoardMember" bm
           ON bm."boardId" = b.id AND bm."userId" = $1
         WHERE b.id = $2`,
        [req.user.id, boardId]
      );

      const row = result.rows[0];
      if (!row) return res.status(404).json({ message: 'Board not found' });

      const effectiveRole = row.ownerId === req.user.id ? 'OWNER' : row.role;

      if (!effectiveRole || !hasRoleOrAbove(effectiveRole, minRole)) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      req.boardRole = effectiveRole;
      next();
    } catch (err) {
      console.error('RequireBoardRole Error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
}
module.exports = { requireBoardRole };