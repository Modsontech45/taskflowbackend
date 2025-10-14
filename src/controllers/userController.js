const pool = require("../config/db");
const bcrypt = require("bcryptjs");

// ---------------- REGISTER USER ----------------
const registerUser = async (req, res) => {
  const { firstName, lastName, email, password, country, phone } = req.body;

  if (!firstName || !lastName || !email || !password) {
    return res
      .status(400)
      .json({ message: "First name, last name, email, and password are required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO "User" 
         (id, "firstName", "lastName", email, password, country, phone, "createdAt", "updatedAt")
       VALUES 
         (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, "firstName", "lastName", email, country, phone, "createdAt", "updatedAt"`,
      [firstName, lastName, email, hashedPassword, country || null, phone || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Register User Error:", error);
    if (error.code === "23505") {
      return res.status(409).json({ message: "Email already registered" });
    }
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------- GET ALL USERS ----------------
const getUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, "firstName", "lastName", email, country, phone, "createdAt", "updatedAt" 
       FROM "User" ORDER BY "createdAt" ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Get Users Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------- GET USER BY ID ----------------
const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`SELECT * FROM "User" WHERE id = $1`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Get User By ID Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------- UPDATE USER ----------------
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, country, phone } = req.body;

  try {
    const result = await pool.query(
      `UPDATE "User"
       SET
         "firstName" = COALESCE($1, "firstName"),
         "lastName" = COALESCE($2, "lastName"),
         country = COALESCE($3, country),
         phone = COALESCE($4, phone),
         "updatedAt" = NOW()
       WHERE id = $5
       RETURNING id, "firstName", "lastName", email, country, phone, "createdAt", "updatedAt"`,
      [firstName, lastName, country, phone, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Update User Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { registerUser, getUsers, getUserById, updateUser };
