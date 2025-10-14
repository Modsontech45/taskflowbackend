// src/routes/userRoutes.js
const express = require("express");
const { registerUser, getUsers,  getUserById , updateUser} = require("../controllers/userController");
const router = express.Router();

router.post("/register", registerUser);
router.get("/", getUsers);
router.get("/profile/:id", getUserById);
router.patch("/profile/:id", updateUser);

module.exports = router;
