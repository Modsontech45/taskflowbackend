// routes/subscriptionRoutes.js
const express = require("express");
const router = express.Router();
const { getSubscription, createSubscription, updateSubscription } = require("./controller");

router.get("/:userId", getSubscription);
router.post("/", createSubscription);
router.patch("/:userId", updateSubscription);

module.exports = router;
