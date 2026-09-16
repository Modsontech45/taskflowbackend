const pool = require("../config/db");

// POST /api/messages/conversations  { participants: [userId, ...] }
exports.createConversation = async (req, res) => {
  const { participants } = req.body;
  const meId = req.user.id;

  if (!Array.isArray(participants) || participants.length === 0)
    return res.status(400).json({ message: "participants required" });

  // Include the requester in the participant list
  const allIds = [...new Set([meId, ...participants])];

  try {
    // Check if a 1-on-1 conversation already exists between these two users
    if (allIds.length === 2) {
      const existing = await pool.query(
        `SELECT c.id FROM "Conversation" c
         JOIN "ConversationParticipant" cp1 ON cp1."conversationId" = c.id AND cp1."userId" = $1
         JOIN "ConversationParticipant" cp2 ON cp2."conversationId" = c.id AND cp2."userId" = $2
         WHERE (SELECT COUNT(*) FROM "ConversationParticipant" WHERE "conversationId" = c.id) = 2
         LIMIT 1`,
        [allIds[0], allIds[1]]
      );
      if (existing.rows.length > 0) {
        return res.json(await getConversationById(existing.rows[0].id, meId));
      }
    }

    const convResult = await pool.query(
      `INSERT INTO "Conversation" (id, "createdAt") VALUES (gen_random_uuid(), NOW()) RETURNING id`
    );
    const convId = convResult.rows[0].id;

    for (const uid of allIds) {
      await pool.query(
        `INSERT INTO "ConversationParticipant" ("conversationId", "userId") VALUES ($1, $2)`,
        [convId, uid]
      );
    }

    res.status(201).json(await getConversationById(convId, meId));
  } catch (err) {
    console.error("Create Conversation Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/messages/conversations
exports.getConversations = async (req, res) => {
  const meId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT DISTINCT c.id FROM "Conversation" c
       JOIN "ConversationParticipant" cp ON cp."conversationId" = c.id AND cp."userId" = $1
       ORDER BY c.id`,
      [meId]
    );

    const convs = await Promise.all(
      result.rows.map((r) => getConversationById(r.id, meId))
    );
    res.json(convs);
  } catch (err) {
    console.error("Get Conversations Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/messages/conversations/:id/messages
exports.getMessages = async (req, res) => {
  const { id: convId } = req.params;
  const meId = req.user.id;
  try {
    // Verify membership
    const member = await pool.query(
      `SELECT 1 FROM "ConversationParticipant" WHERE "conversationId" = $1 AND "userId" = $2`,
      [convId, meId]
    );
    if (!member.rows.length) return res.status(403).json({ message: "Forbidden" });

    const result = await pool.query(
      `SELECT id, "authorId", text, tags, "createdAt"
       FROM "Message"
       WHERE "conversationId" = $1
       ORDER BY "createdAt" ASC`,
      [convId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get Messages Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/messages/conversations/:id/messages  { text, tags }
exports.sendMessage = async (req, res) => {
  const { id: convId } = req.params;
  const { text, tags } = req.body;
  const meId = req.user.id;

  if (!text?.trim()) return res.status(400).json({ message: "text required" });

  try {
    const member = await pool.query(
      `SELECT 1 FROM "ConversationParticipant" WHERE "conversationId" = $1 AND "userId" = $2`,
      [convId, meId]
    );
    if (!member.rows.length) return res.status(403).json({ message: "Forbidden" });

    const result = await pool.query(
      `INSERT INTO "Message" (id, "conversationId", "authorId", text, tags, "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
       RETURNING id, "authorId", text, tags, "createdAt"`,
      [convId, meId, text, tags || []]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Send Message Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/messages/users/search?q=
exports.searchUsers = async (req, res) => {
  const { q } = req.query;
  if (!q?.trim()) return res.status(400).json({ message: "Search query required" });

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
  } catch (err) {
    console.error("Search Users Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Helper: build a full conversation object with participants and lastMessage
async function getConversationById(convId, meId) {
  const participants = await pool.query(
    `SELECT u.id, u."firstName", u."lastName", u.email
     FROM "ConversationParticipant" cp
     JOIN "User" u ON u.id = cp."userId"
     WHERE cp."conversationId" = $1`,
    [convId]
  );

  const lastMsg = await pool.query(
    `SELECT id, "authorId", text, tags, "createdAt"
     FROM "Message"
     WHERE "conversationId" = $1
     ORDER BY "createdAt" DESC LIMIT 1`,
    [convId]
  );

  const unread = await pool.query(
    `SELECT COUNT(*) FROM "Message"
     WHERE "conversationId" = $1 AND "authorId" != $2 AND "isRead" = false`,
    [convId, meId]
  );

  return {
    id: convId,
    participants: participants.rows,
    lastMessage: lastMsg.rows[0] || null,
    unreadCount: parseInt(unread.rows[0].count, 10),
  };
}
