const { verifyJWT } = require('../utils/tokens');
const prisma = require('../config/prisma');

function requireAuth(excludePaths = []) {
  return async (req, res, next) => {
    // Skip authentication for excluded paths
    if (excludePaths.includes(req.path)) return next();

    const header = req.headers.authorization || req.headers.Authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    try {
      const payload = verifyJWT(token);
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) return res.status(401).json({ message: 'Unauthorized' });
      req.user = user;
      next();
    } catch {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  };
}

module.exports = { requireAuth };
