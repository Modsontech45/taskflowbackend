const express = require("express");
const cors = require("cors");
require("dotenv").config();
const cron = require("node-cron");
const axios = require("axios");

const authRoutes = require("./modules/auth/routes");
const boardRoutes = require("./modules/boards/routes");
const taskRoutes = require("./modules/tasks/routes");
const memberRoutes = require("./modules/members/routes");
const messageRoutes = require("./messages/messageRoutes");
const notificationRoutes = require("./modules/notifications/routes");
const { requireAuth } = require("./middleware/auth");
const friendRoutes = require("./friends/friendRoutes");
// const paymentsroutes = require("./subscription/routes/payments");
const User = require("./routes/userRoutes");
const app = express();

// Middleware to log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// CORS configuration
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "https://taskflow-nine-henna.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      console.log("🌐 Incoming Origin:", origin);
      if (!origin || allowedOrigins.includes(origin))
        return callback(null, true);
      console.error(`❌ CORS blocked: ${origin}`);
      return callback(new Error("CORS not allowed for this origin"), false);
    },
    // origin: "*", // Allow all origins
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

app.use(express.json());

// Root endpoint
app.get("/", (_, res) => res.send("Task API running"));
app.use("/api/friends", friendRoutes);
// Auth routes — allow public routes for email verification & password reset
app.use("/api/auth", authRoutes);
// app.use("/api/subscriptions", subscriptionRoutes);
// app.use("/api/payments", paymentsroutes); // Paystack callback route
app.use("/api/messages", messageRoutes);
app.use("/api/members", requireAuth(), memberRoutes);
// Protected routes (require JWT)
app.use("/api", User);
app.use("/api/boards", requireAuth(), boardRoutes);
app.use("/api/notifications", requireAuth(), notificationRoutes);
app.use("/api", requireAuth(), taskRoutes); // /boards/:boardId/tasks and /tasks/:id

// Print all endpoints
function listRoutes(stack, prefix = "") {
  stack.forEach((middleware) => {
    if (middleware.route) {
      const methods = Object.keys(middleware.route.methods)
        .map((m) => m.toUpperCase())
        .join(", ");
      console.log(`${methods} ${prefix}${middleware.route.path}`);
    } else if (middleware.name === "router" && middleware.handle.stack) {
      const newPrefix = middleware.regexp?.source
        .replace("\\/?", "")
        .replace("(?=\\/|$)", "")
        .replace("^", "")
        .replace("$", "");
      listRoutes(
        middleware.handle.stack,
        prefix + (newPrefix === "" ? "" : "/" + newPrefix)
      );
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

const SERVER_URL = "https://taskflowbackend-0hbp.onrender.com/";

// Cron job: every 5 minutes
cron.schedule("*/5 * * * *", async () => {
  try {
    console.log(
      `[${new Date().toISOString()}] ⏰ Pinging server to keep alive...`
    );
    const response = await axios.get(SERVER_URL);
    console.log(
      `[${new Date().toISOString()}] ✅ Server responded with status: ${
        response.status
      }`
    );
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] ❌ Error pinging server:`,
      error.message
    );
  }
});
