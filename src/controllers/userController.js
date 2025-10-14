const pool = require("../config/db");
const bcrypt = require("bcryptjs");

// ---------------- REGISTER USER ----------------
const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res
      .status(400)
      .json({ message: "Name, email, and password are required" });

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user into database
    const result = await pool.query(
      `INSERT INTO "User" (id, name, email, password, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
       RETURNING id, name, email, "createdAt", "updatedAt"`,
      [name, email, hashedPassword]
    );

    const user = result.rows[0];
    res.status(201).json(user);
  } catch (error) {
    console.error("Register User Error:", error);

    // Check for duplicate email
    if (error.code === "23505") {
      return res.status(409).json({ message: "Email already registered" });
    }

    res.status(500).json({ message: "Server error" });
  }
};

// ---------------- GET USERS ----------------
const getUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, "createdAt", "updatedAt" FROM "User" ORDER BY "createdAt" ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Get Users Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
// ---------------- GET SINGLE USER ----------------
const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, name, email, "createdAt", "updatedAt" 
       FROM "User" 
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Get User By ID Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


module.exports = { registerUser, getUsers, getUserById };


