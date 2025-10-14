const pool = require("../config/db");

/**
 * @desc Send a new message
 * @route POST /api/messages
 */
exports.sendMessage = async (req, res) => {
  const { sender_id, receiver_id, content } = req.body;

  if (!sender_id || !receiver_id || !content) {
    return res
      .status(400)
      .json({ error: "sender_id, receiver_id, and content are required." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [sender_id, receiver_id, content]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
};

/**
 * @desc Get all messages between two users
 * @route GET /api/messages/conversation/:userA/:userB
 */
exports.getConversation = async (req, res) => {
  const { userA, userB } = req.params;

  try {
    const result = await pool.query(
      `SELECT *
       FROM messages
       WHERE (sender_id = $1 AND receiver_id = $2)
          OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC`,
      [userA, userB]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching conversation:", err);
    res.status(500).json({ error: "Failed to fetch conversation" });
  }
};

/**
 * @desc Get all messages received by a user
 * @route GET /api/messages/inbox/:userId
 */
exports.getInbox = async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM messages
       WHERE receiver_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching inbox:", err);
    res.status(500).json({ error: "Failed to fetch inbox" });
  }
};

/**
 * @desc Mark a message as read
 * @route PATCH /api/messages/:id/read
 */
exports.markAsRead = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE messages
       SET is_read = TRUE, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Message not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Error marking message as read:", err);
    res.status(500).json({ error: "Failed to mark message as read" });
  }
};

/**
 * @desc Delete a message
 * @route DELETE /api/messages/:id
 */
exports.deleteMessage = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM messages
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Message not found" });
    }

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (err) {
    console.error("Error deleting message:", err);
    res.status(500).json({ error: "Failed to delete message" });
  }
};
exports.searchUsers = async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim() === "") {
    return res.status(400).json({ message: "Search query required" });
  }

  try {
    const result = await pool.query(
      `SELECT id, "firstName", "lastName", email
       FROM "User"
       WHERE LOWER("firstName") LIKE LOWER($1)
          OR LOWER("lastName") LIKE LOWER($1)
          OR LOWER(email) LIKE LOWER($1)
       LIMIT 10`,
      [`%${q}%`]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Search Users Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};