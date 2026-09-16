const pool = require("../../config/db");

// GET /api/boards/:boardId/tasks/:taskId/comments
exports.getComments = async (req, res) => {
  const { taskId } = req.params;
  try {
    const result = await pool.query(
      `SELECT tc.id, tc.content, tc."createdAt", tc."updatedAt",
              u.id AS "authorId", u."firstName", u."lastName", u.email
       FROM "TaskComment" tc
       JOIN "User" u ON u.id = tc."authorId"
       WHERE tc."taskId" = $1
       ORDER BY tc."createdAt" ASC`,
      [taskId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get Comments Error:", err);
    res.status(500).json({ message: "Failed to get comments" });
  }
};

// POST /api/boards/:boardId/tasks/:taskId/comments
exports.addComment = async (req, res) => {
  const { taskId } = req.params;
  const { content } = req.body;
  const authorId = req.user.id;

  if (!content?.trim())
    return res.status(400).json({ message: "Comment content is required" });

  try {
    const result = await pool.query(
      `INSERT INTO "TaskComment" (id, "taskId", "authorId", content, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
       RETURNING id, content, "createdAt", "updatedAt", "authorId"`,
      [taskId, authorId, content.trim()]
    );

    const comment = result.rows[0];

    // Fetch author info to return full comment
    const userResult = await pool.query(
      `SELECT "firstName", "lastName", email FROM "User" WHERE id = $1`,
      [authorId]
    );
    const author = userResult.rows[0];

    res.status(201).json({ ...comment, ...author });
  } catch (err) {
    console.error("Add Comment Error:", err);
    res.status(500).json({ message: "Failed to add comment" });
  }
};

// DELETE /api/boards/:boardId/tasks/:taskId/comments/:commentId
exports.deleteComment = async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user.id;
  try {
    const result = await pool.query(
      `DELETE FROM "TaskComment" WHERE id = $1 AND "authorId" = $2 RETURNING id`,
      [commentId, userId]
    );
    if (!result.rows.length)
      return res.status(404).json({ message: "Comment not found or not yours" });
    res.status(204).send();
  } catch (err) {
    console.error("Delete Comment Error:", err);
    res.status(500).json({ message: "Failed to delete comment" });
  }
};
