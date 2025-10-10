const express = require("express");
const router = express.Router();
const ctrl = require("./controller");

// Get all notifications for user
router.get("", ctrl.getUserNotifications);

// Mark one as read
router.patch("/:id/read", ctrl.markAsRead);

// Delete one
router.delete("/:id", ctrl.deleteNotification);

module.exports = router;
