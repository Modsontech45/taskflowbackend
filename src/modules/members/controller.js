const pool = require("../../config/db");

// ---------------- LIST MEMBERS ----------------
const listMembers = async (req, res) => {
  const { boardId } = req.params;

  try {
    const result = await pool.query(
      `SELECT bm.id, bm.role, bm."createdAt",
              u.id AS "userId", u."firstName", u."lastName", u.email
       FROM "BoardMember" bm
       JOIN "User" u ON u.id = bm."userId"
       WHERE bm."boardId" = $1
       ORDER BY bm."createdAt" ASC`,
      [boardId]
    );

    const members = result.rows.map(row => ({
      id: row.id,
      role: row.role,
      createdAt: row.createdAt,
      user: {
        id: row.userId,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
      },
    }));

    res.json({ members });
  } catch (err) {
    console.error("List Members Error:", err);
    res.status(500).json({ message: "Failed to fetch members" });
  }
};

// ---------------- ADD MEMBER ----------------
const addMember = async (req, res) => {
  const { boardId } = req.params;
  const { userId: userEmail, role } = req.body; // userId here is actually email

  if (!boardId || !userEmail || !role)
    return res.status(400).json({ message: "Missing parameters" });

  try {
    // Find user by email
    const userResult = await pool.query(
      `SELECT id, "firstName", "lastName", email FROM "User" WHERE email = $1`,
      [userEmail]
    );
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ message: "User not found" });

    // Insert member
    const memberResult = await pool.query(
      `INSERT INTO "BoardMember" (id, "boardId", "userId", role, "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3, NOW())
       RETURNING *`,
      [boardId, user.id, role]
    );
    const member = memberResult.rows[0];

    res.json({
      id: member.id,
      userId: member.userId,
      role: member.role,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Add Member Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ---------------- UPDATE MEMBER ROLE ----------------
const updateMemberRole = async (req, res) => {
  const { boardId, userId } = req.params;
  const { role } = req.body;

  if (!role) return res.status(400).json({ message: "role is required" });

  try {
    const result = await pool.query(
      `UPDATE "BoardMember" 
       SET role = $1
       WHERE "boardId" = $2 AND "userId" = $3
       RETURNING id, role, "userId"`,
      [role, boardId, userId]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Membership not found" });

    // Fetch user details
    const userResult = await pool.query(
      `SELECT id, "firstName", "lastName", email FROM "User" WHERE id = $1`,
      [userId]
    );
    const user = userResult.rows[0];

    res.json({
      id: result.rows[0].id,
      role: result.rows[0].role,
      user,
    });
  } catch (err) {
    console.error("Update Member Role Error:", err);
    res.status(500).json({ message: "Failed to update member role" });
  }
};

// ---------------- REMOVE MEMBER ----------------
const removeMember = async (req, res) => {
  const { boardId, userId } = req.params;

  try {
    await pool.query(
      `DELETE FROM "BoardMember" WHERE "boardId" = $1 AND "userId" = $2`,
      [boardId, userId]
    );
    res.status(204).send();
  } catch (err) {
    console.error("Remove Member Error:", err);
    res.status(500).json({ message: "Failed to remove member" });
  }
};

// Export all functions
module.exports = {
  listMembers,
  addMember,
  updateMemberRole,
  removeMember,
};
