
const pool = require("../../config/db");
// ---------------- CREATE BOARD ----------------
const createBoard = async (req, res) => {
  try {
    const result = await pool.query(
      `INSERT INTO "Board" (id, name, "ownerId", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, NOW(), NOW()) RETURNING *`,
      [req.body.name, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create Board Error:", err);
    res.status(500).json({ message: "Failed to create board" });
  }
};

// ---------------- LIST BOARDS ----------------
const listBoards = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT b.*, 
              COALESCE(t.active_tasks, 0) AS "activeTasks",
              json_agg(json_build_object('userId', m."userId", 'role', m.role)) 
                FILTER (WHERE m."userId" IS NOT NULL) AS members
       FROM "Board" b
       LEFT JOIN (
         SELECT "boardId", COUNT(*) AS active_tasks
         FROM "Task"
         WHERE "isDone" = false
         GROUP BY "boardId"
       ) t ON t."boardId" = b.id
       LEFT JOIN "BoardMember" m ON m."boardId" = b.id
       WHERE b."ownerId" = $1 OR b.id IN (
         SELECT "boardId" FROM "BoardMember" WHERE "userId" = $1
       )
       GROUP BY b.id, t.active_tasks
       ORDER BY b."createdAt" DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("List Boards Error:", err);
    res.status(500).json({ message: "Failed to list boards" });
  }
};

// ---------------- GET BOARD ----------------
const getBoard = async (req, res) => {
  const boardId = req.params.id;
  try {
    const result = await pool.query(
      `SELECT b.*, 
              json_agg(json_build_object('id', u.id, 'firstName', u."firstName", 'lastName', u."lastName", 'email', u.email, 'role', u.role)) 
                FILTER (WHERE u.id IS NOT NULL) AS members
       FROM "Board" b
       LEFT JOIN "BoardMember" bm ON bm."boardId" = b.id
       LEFT JOIN "User" u ON u.id = bm."userId"
       WHERE b.id = $1
       GROUP BY b.id`,
      [boardId]
    );

    const board = result.rows[0];
    if (!board) return res.status(404).json({ message: "Not found" });
    res.json(board);
  } catch (err) {
    console.error("Get Board Error:", err);
    res.status(500).json({ message: "Failed to get board" });
  }
};

// ---------------- RENAME BOARD ----------------
const renameBoard = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE "Board" SET name = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING *`,
      [req.body.name, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Rename Board Error:", err);
    res.status(500).json({ message: "Failed to rename board" });
  }
};

// ---------------- DELETE BOARD ----------------
const deleteBoard = async (req, res) => {
  try {
    await pool.query(`DELETE FROM "Board" WHERE id = $1`, [req.params.id]);
    res.status(204).send();
  } catch (err) {
    console.error("Delete Board Error:", err);
    res.status(500).json({ message: "Failed to delete board" });
  }
};

// ---------------- SHARE BOARD ----------------
const shareBoard = async (req, res) => {
  const { email, role } = req.body;
  const boardId = req.params.id;

  try {
    const userResult = await pool.query(
      `SELECT id FROM "User" WHERE email = $1`,
      [email]
    );
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ message: "User with that email not found" });

    // Upsert membership
    const membershipResult = await pool.query(
      `INSERT INTO "BoardMember" ("boardId", "userId", role, "createdAt")
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT ("boardId", "userId") DO UPDATE SET role = EXCLUDED.role
       RETURNING *`,
      [boardId, user.id, role]
    );

    res.json({ message: "Shared", membership: membershipResult.rows[0] });
  } catch (err) {
    console.error("Share Board Error:", err);
    res.status(500).json({ message: "Failed to share board" });
  }
};

// ---------------- LIST MEMBERS ----------------
const listMembers = async (req, res) => {
  const boardId = req.params.id;
  try {
    const result = await pool.query(
      `SELECT u.id, u."firstName", u."lastName", u.email, bm.role
       FROM "BoardMember" bm
       JOIN "User" u ON u.id = bm."userId"
       WHERE bm."boardId" = $1`,
      [boardId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("List Members Error:", err);
    res.status(500).json({ message: "Failed to list members" });
  }
};

// ---------------- REMOVE MEMBER ----------------
 const removeMember = async (req, res) => {
  const { id: boardId, memberId: userId } = req.params;
  try {
    await pool.query(
      `DELETE FROM "BoardMember" WHERE "boardId" = $1 AND "userId" = $2`,
      [boardId, userId]
    );
    res.json({ message: "Member removed" });
  } catch (err) {
    console.error("Remove Member Error:", err);
    res.status(500).json({ message: "Failed to remove member" });
  }
};

// ---------------- CHANGE MEMBER ROLE ----------------
const changeMemberRole = async (req, res) => {
  const { id: boardId, memberId: userId } = req.params;
  const { role } = req.body;
  try {
    const result = await pool.query(
      `UPDATE "BoardMember" SET role = $1 WHERE "boardId" = $2 AND "userId" = $3 RETURNING *`,
      [role, boardId, userId]
    );
    res.json({ message: "Role updated", membership: result.rows[0] });
  } catch (err) {
    console.error("Change Member Role Error:", err);
    res.status(500).json({ message: "Failed to update role" });
  }
};
module.exports = {
  createBoard,
  listBoards,
  getBoard,
  renameBoard,
  deleteBoard,
  shareBoard,
  listMembers,
  removeMember,
  changeMemberRole,
};
