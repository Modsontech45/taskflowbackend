const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./modules/auth/routes');
const boardRoutes = require('./modules/boards/routes');
const taskRoutes = require('./modules/tasks/routes');
const memberRoutes = require('./modules/members/routes');
const { requireAuth } = require('./middleware/auth');

const app = express();

// Middleware to log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// CORS configuration
const allowedOrigins = [
  "http://localhost:8080",
  "http://127.0.0.1:5500",
  "http://localhost:5173",
  "https://bolt.new",
  "http://localhost:3000",
  "http://192.168.1.142:3000",
  "https://rfid-attendance-synctuario-theta.vercel.app",
  "https://taskflow-nine-henna.vercel.app",
  "https://rfid-attendancesystem-backend-project.onrender.com",
  "https://zp1v56uxy8rdx5ypatb0ockcb9tr6a-oci3--5173--96435430.local-credentialless.webcontainer-api.io",
];

app.use(cors({
  origin: (origin, callback) => {
    console.log("🌐 Incoming Origin:", origin);
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    console.error(`❌ CORS blocked: ${origin}`);
    return callback(new Error("CORS not allowed for this origin"), false);
  },
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  credentials: true,
}));

app.use(express.json());

// Root endpoint
app.get('/', (_, res) => res.send('Task API running'));

// Auth routes — allow public routes for email verification & password reset
app.use('/api/auth', authRoutes);

app.use('/api/members',requireAuth(), memberRoutes);
// Protected routes (require JWT)
app.use('/api/boards', requireAuth(), boardRoutes);
app.use('/api', requireAuth(), taskRoutes); // /boards/:boardId/tasks and /tasks/:id

// Print all endpoints
function listRoutes(stack, prefix = '') {
  stack.forEach((middleware) => {
    if (middleware.route) {
      const methods = Object.keys(middleware.route.methods).map(m => m.toUpperCase()).join(", ");
      console.log(`${methods} ${prefix}${middleware.route.path}`);
    } else if (middleware.name === 'router' && middleware.handle.stack) {
      const newPrefix = middleware.regexp?.source
        .replace('\\/?', '')
        .replace('(?=\\/|$)', '')
        .replace('^', '')
        .replace('$', '');
      listRoutes(middleware.handle.stack, prefix + (newPrefix === '' ? '' : '/' + newPrefix));
    }
  });
}

if (app._router && app._router.stack) {
  console.log("🚀 Available endpoints:");
  listRoutes(app._router.stack);
}

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server on ${PORT}`));




// GET /api/notifications → fetch all notifications for a user

// POST /api/notifications → create a new notification (triggered on activity)

// PATCH /api/notifications/:id/read → mark as read

// Subscriptions:

// GET /api/subscriptions/:userId → get user subscription info

// POST /api/subscriptions → create/start subscription

// PATCH /api/subscriptions/:userId → update subscription (e.g., when members are added/removed)

// Profile:

// GET /api/profile/:userId → fetch user profile info

// PATCH /api/profile/:userId → update user profile