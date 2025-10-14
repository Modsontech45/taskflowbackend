const express = require("express");
const {
  sendFriendRequest,
  getFriendRequests,
  respondToFriendRequest,
  getFriends,
  getFriendStatus,
} = require("./friendController");
const { requireAuth } = require("../middleware/auth");
const router = express.Router();

router.post("/requests", requireAuth, sendFriendRequest);
router.get("/requests", requireAuth, getFriendRequests);
router.patch("/requests/:id", requireAuth, respondToFriendRequest);
router.get("/:id", requireAuth, getFriends);
router.get("/status/:targetId", requireAuth, getFriendStatus);

module.exports = router;
