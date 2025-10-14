// server.js
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const app = express();
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Map to store connected clients by userId
const clients = new Map();

wss.on("connection", (ws, req) => {
  // Example: userId passed as query param ?userId=123
  const userId = new URL(req.url, "http://localhost").searchParams.get("userId");
  if (userId) {
    clients.set(userId, ws);
  }

  ws.on("close", () => {
    if (userId) clients.delete(userId);
  });
});

// Export function to send notification
function sendRealtimeNotification(userId, notification) {
  const ws = clients.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(notification));
  }
}

module.exports = { app, server, sendRealtimeNotification };
