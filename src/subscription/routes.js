// routes.js
const express = require("express");
const router = express.Router();

// ✅ Correct relative path for same folder
const { getSubscription, createSubscription, updateSubscription } = require("./controller");

router.get("/:userId", getSubscription);
router.post("/", createSubscription);
router.patch("/:userId", updateSubscription);

module.exports = router;
