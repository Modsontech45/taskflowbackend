const pool = require("../../config/db");
const { sendRealtimeNotification } = require("../../../notserver");
const createNotification = async (userId, boardId, taskId, title, message) => {
  try {
    const result = await pool.query(
      `INSERT INTO "Notification" ("userId", "boardId","taskId", title, message)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, boardId, taskId, title, message]
    );

    const newNotification = result.rows[0];

    // Send real-time notification via WebSocket
    sendRealtimeNotification(userId, newNotification);

  } catch (err) {
    console.error("Create Notification Error:", err);
  }
};
// ---------------- GET USER NOTIFICATIONS ----------------
const getUserNotifications = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT n.*, b.name AS "boardName"
       FROM "Notification" n
       LEFT JOIN "Board" b ON b.id = n."boardId"
       WHERE n."userId" = $1
       ORDER BY n."createdAt" DESC`,
      [userId]
    );
    console.log(result.rows, result.rowCount);
    res.json(result.rows);
  } catch (err) {
    console.error("Get User Notifications Error:", err);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

// ---------------- MARK AS READ ----------------
const markAsRead = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const result = await pool.query(
      `UPDATE "Notification"
       SET "isRead" = TRUE
       WHERE id = $1 AND "userId" = $2
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Notification not found" });

    res.json({ message: "Marked as read", notification: result.rows[0] });
  } catch (err) {
    console.error("Mark As Read Error:", err);
    res.status(500).json({ message: "Failed to mark notification as read" });
  }
};

// ---------------- DELETE NOTIFICATION ----------------
const deleteNotification = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    await pool.query(
      `DELETE FROM "Notification" WHERE id = $1 AND "userId" = $2`,
      [id, userId]
    );
    res.json({ message: "Notification deleted" });
  } catch (err) {
    console.error("Delete Notification Error:", err);
    res.status(500).json({ message: "Failed to delete notification" });
  }
};

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  deleteNotification,
};
