const express = require("express");
const ctrl = require("./messageController");
const { requireAuth } = require("../middleware/auth");
const router = express.Router();

router.use(requireAuth());

router.get("/users/search", ctrl.searchUsers);
router.post("/conversations", ctrl.createConversation);
router.get("/conversations", ctrl.getConversations);
router.get("/conversations/:id/messages", ctrl.getMessages);
router.post("/conversations/:id/messages", ctrl.sendMessage);

module.exports = router;
