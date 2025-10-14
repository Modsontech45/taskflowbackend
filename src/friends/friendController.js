const pool = require("../config/db");

// ---------------------------- SEND FRIEND REQUEST ----------------------------
exports.sendFriendRequest = async (req, res) => {
  const senderId = req.user?.id; // from auth middleware
  const { receiverId } = req.body;
  console.log("Receiver ID:", receiverId);
  console.log("Sender ID:", senderId);
  if (!senderId || !receiverId)
    return res.status(400).json({ message: "Sender and receiver IDs required" });

  if (senderId === receiverId)
    return res.status(400).json({ message: "You cannot send a request to yourself" });

  try {
    // Check if a request or friendship already exists
    const existing = await pool.query(
      `SELECT * FROM "FriendRequest"
       WHERE ((sender_id = $1 AND receiver_id = $2)
          OR (sender_id = $2 AND receiver_id = $1))
         AND status IN ('pending', 'accepted')
       LIMIT 1`,
      [senderId, receiverId]
    );

    if (existing.rows.length > 0) {
      const reqStatus = existing.rows[0].status;
      return res.status(400).json({
        message:
          reqStatus === "pending"
            ? "Friend request already pending"
            : "You are already friends",
      });
    }

    const result = await pool.query(
      `INSERT INTO "FriendRequest" (sender_id, receiver_id, status)
       VALUES ($1, $2, 'pending')
       RETURNING id, sender_id AS "senderId", receiver_id AS "receiverId", status, created_at AS "createdAt"`,
      [senderId, receiverId]
    );

    res.status(201).json({
      message: "Friend request sent successfully",
      request: result.rows[0],
    });
  } catch (error) {
    console.error("Send Friend Request Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------------------- GET FRIEND REQUESTS ----------------------------
exports.getFriendRequests = async (req, res) => {
  const userId = req.user?.id;

  if (!userId)
    return res.status(401).json({ message: "Unauthorized: user not found" });

  try {
    const result = await pool.query(
      `SELECT fr.id,
              fr.status,
              fr.sender_id AS "senderId",
              u."firstName",
              u."lastName",
              u.email
       FROM "FriendRequest" fr
       JOIN "User" u ON fr.sender_id = u.id
       WHERE fr.receiver_id = $1
       AND fr.status = 'pending'
       ORDER BY fr.created_at DESC`,
      [userId]
    );

    res.json({ requests: result.rows });
  } catch (error) {
    console.error("Get Friend Requests Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------------------- RESPOND TO REQUEST ----------------------------
exports.respondToFriendRequest = async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // "accept" or "reject"
  const userId = req.user?.id;

  if (!userId)
    return res.status(401).json({ message: "Unauthorized: user not found" });

  if (!["accept", "reject"].includes(action))
    return res.status(400).json({ message: "Invalid action" });

  try {
    // Get request first
    const { rows } = await pool.query(
      `SELECT * FROM "FriendRequest" WHERE id = $1 AND receiver_id = $2`,
      [id, userId]
    );

    if (rows.length === 0)
      return res.status(404).json({ message: "Friend request not found" });

    const request = rows[0];
    let updatedStatus = action === "accept" ? "accepted" : "rejected";

    // Update request status
    const updated = await pool.query(
      `UPDATE "FriendRequest"
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, sender_id AS "senderId", receiver_id AS "receiverId", status`,
      [updatedStatus, id]
    );

    // If accepted, create mutual friendship record (optional but useful)
    if (action === "accept") {
      await pool.query(
        `INSERT INTO "Friendship" (user_id, friend_id)
         VALUES ($1, $2), ($2, $1)
         ON CONFLICT DO NOTHING`,
        [request.sender_id, request.receiver_id]
      );
    }

    res.json({ message: `Request ${updatedStatus}`, request: updated.rows[0] });
  } catch (error) {
    console.error("Respond to Friend Request Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------------------- GET USER FRIENDS ----------------------------
exports.getFriends = async (req, res) => {
  const userId = req.user?.id || req.params.id;

  try {
    const result = await pool.query(
      `SELECT u.id, u."firstName", u."lastName", u.email
       FROM "Friendship" f
       JOIN "User" u ON f.friend_id = u.id
       WHERE f.user_id = $1`,
      [userId]
    );

    res.json({ friends: result.rows });
  } catch (error) {
    console.error("Get Friends Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------------------- FRIEND STATUS ----------------------------
exports.getFriendStatus = async (req, res) => {
  const userId = req.user?.id;
  const { targetId } = req.params;

  try {
    // check if friends
    const friendship = await pool.query(
      `SELECT 1 FROM "Friendship" WHERE user_id = $1 AND friend_id = $2`,
      [userId, targetId]
    );

    if (friendship.rows.length > 0)
      return res.json({ status: "friends" });

    // check if pending request
    const request = await pool.query(
      `SELECT status, sender_id FROM "FriendRequest"
       WHERE (sender_id = $1 AND receiver_id = $2)
          OR (sender_id = $2 AND receiver_id = $1)
       LIMIT 1`,
      [userId, targetId]
    );

    if (request.rows.length > 0) {
      const row = request.rows[0];
      if (row.status === "pending") {
        return res.json({
          status: row.sender_id === userId ? "requested" : "pending",
        });
      }
    }

    res.json({ status: "none" });
  } catch (error) {
    console.error("Get Friend Status Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
