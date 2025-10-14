const pool = require("../../config/db");
const notificationService = require("../notifications/service");
// ---------------- CREATE TASK ----------------
exports.createTask = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { title, notes, startAt, endAt } = req.body;

    // Optional: author name or email
    const author = req.user?.name || req.user?.email || "Unknown";

    const result = await pool.query(
      `INSERT INTO "Task" 
         (id, "boardId", title, notes, "startAt", "endAt", "createdById", author, "createdAt", "updatedAt")
       VALUES 
         (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [boardId, title, notes, new Date(startAt), new Date(endAt), req.user.id, author]
    );

    const newTask = result.rows[0];

    // fire notification (no await – async)
    notificationService
      .notifyBoardMembersOfNewTask({
        boardId,
        task: newTask,
        creatorId: req.user.id,
      })
      .catch((err) => console.error("Notify Error:", err));

    res.status(201).json(newTask);
  } catch (error) {
    console.error("Create Task Error:", error);
    res.status(500).json({ message: "Failed to create task" });
  }
};

// ---------------- LIST TASKS ----------------
exports.listTasks = async (req, res) => {
  try {
    const { boardId } = req.params;

    const result = await pool.query(
      `SELECT * FROM "Task" WHERE "boardId" = $1 ORDER BY "startAt" ASC`,
      [boardId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("List Tasks Error:", error);
    res.status(500).json({ message: "Failed to list tasks" });
  }
};

// ---------------- UPDATE TASK ----------------
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const fields = [];
    const values = [];
    let idx = 1;

    // dynamically build query from request body
    for (const [key, value] of Object.entries(req.body)) {
      if (key === "startAt" || key === "endAt") {
        fields.push(`"${key}" = $${idx}`);
        values.push(new Date(value));
      } else {
        fields.push(`"${key}" = $${idx}`);
        values.push(value);
      }
      idx++;
    }

    // ✅ include updatedBy (who updated the task)
    // assuming you have user info in req.user or req.body.updatedBy
    const updatedBy =
      req.user?.name || req.user?.email || req.body.updatedBy || "Unknown";

    fields.push(`"updatedBy" = $${idx}`);
    values.push(updatedBy);
    idx++;

    // ✅ update query
    values.push(id);
    const query = `
      UPDATE "Task"
      SET ${fields.join(", ")}, "updatedAt" = NOW()
      WHERE id = $${idx}
      RETURNING *;
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Task not found" });

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Update Task Error:", error);
    res.status(500).json({ message: "Failed to update task" });
  }
};

// ---------------- DELETE TASK ----------------
exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`DELETE FROM "Task" WHERE id = $1`, [id]);
    res.status(204).send();
  } catch (error) {
    console.error("Delete Task Error:", error);
    res.status(500).json({ message: "Failed to delete task" });
  }
};

// ---------------- TOGGLE TASK ----------------
exports.toggleTask = async (req, res) => {
  try {
    const { id } = req.params;

    // Get current task
    const taskResult = await pool.query(`SELECT * FROM "Task" WHERE id = $1`, [
      id,
    ]);
    const task = taskResult.rows[0];
    if (!task) return res.status(404).json({ message: "Task not found" });

    const isNowDone = !task.isDone;
    const status = isNowDone ? "expired" : "pending";
    const doneAt = isNowDone ? new Date() : null;

    // Get the user performing the toggle (assuming req.user exists)
    const completedBy = isNowDone
      ? req.user?.name || req.user?.email || "Unknown"
      : null;

    const updated = await pool.query(
      `UPDATE "Task" 
       SET "isDone" = $1, 
           "doneAt" = $2, 
           status = $3, 
           "completedBy" = $4,
           "updatedAt" = NOW()
       WHERE id = $5
       RETURNING *`,
      [isNowDone, doneAt, status, completedBy, id]
    );

    res.json(updated.rows[0]);
  } catch (error) {
    console.error("Toggle Task Error:", error);
    res.status(500).json({ message: "Failed to toggle task" });
  }
};
