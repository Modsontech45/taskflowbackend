const express = require("express");
const {
  sendMessage,
  getConversation,
  getInbox,
  markAsRead,
  deleteMessage,
  searchUsers ,
} = require("./messageController");

const router = express.Router();

// Send a message
router.post("/", sendMessage);
router.get("/users/search", searchUsers);
// Get conversation between two users
router.get("/conversation/:userA/:userB", getConversation);

// Get a user's inbox
router.get("/inbox/:userId", getInbox);

// Mark a message as read
router.patch("/:id/read", markAsRead);

// Delete a message
router.delete("/:id", deleteMessage);

module.exports = router;
