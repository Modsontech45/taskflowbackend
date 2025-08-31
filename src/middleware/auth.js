const { verifyJWT } = require('../utils/tokens');
const prisma = require('../config/prisma');

function requireAuth(excludePaths = []) {
  return async (req, res, next) => {
    try {
      // Skip authentication for excluded paths
      if (excludePaths.includes(req.path)) return next();

      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log("❌ Missing or invalid Authorization header");
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const token = authHeader.slice(7);
      let payload;

      try {
        payload = verifyJWT(token);
      } catch (err) {
        console.error("❌ JWT verification failed:", err.message);
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) {
        console.log(`❌ User not found for id: ${payload.sub}`);
        return res.status(401).json({ message: 'Unauthorized' });
      }

      req.user = user; // attach user to request
      next();
    } catch (err) {
      console.error("❌ Auth middleware error:", err);
      res.status(500).json({ message: 'Server error' });
    }
  };
}

module.exports = { requireAuth };
