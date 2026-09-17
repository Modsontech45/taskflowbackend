const pool = require("../../config/db");
const notificationService = require("../notifications/service");

// ---- helpers ----
function shiftDate(date, type) {
  const d = new Date(date);
  if (type === 'DAILY')   d.setDate(d.getDate() + 1);
  if (type === 'WEEKLY')  d.setDate(d.getDate() + 7);
  if (type === 'MONTHLY') d.setMonth(d.getMonth() + 1);
  return d;
}

// ---------------- CREATE TASK ----------------
exports.createTask = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { title, notes, startAt, endAt, priority = 'MEDIUM', assigneeId = null, recurringType = 'NONE' } = req.body;

    const result = await pool.query(
      `INSERT INTO "Task"
         (id, "boardId", title, notes, "startAt", "endAt", priority, "assigneeId", "recurringType", "createdById", "createdAt", "updatedAt")
       VALUES
         (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING *`,
      [boardId, title, notes, new Date(startAt), new Date(endAt), priority, assigneeId, recurringType, req.user.id]
    );

    const newTask = result.rows[0];

    notificationService
      .notifyBoardMembersOfNewTask({ boardId, task: newTask, creatorId: req.user.id })
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
      `SELECT t.*,
              json_build_object(
                'id', u.id,
                'firstName', u."firstName",
                'lastName', u."lastName",
                'email', u.email
              ) AS "createdBy",
              CASE WHEN a.id IS NOT NULL THEN
                json_build_object(
                  'id', a.id,
                  'firstName', a."firstName",
                  'lastName', a."lastName",
                  'email', a.email
                )
              ELSE NULL END AS "assignee"
       FROM "Task" t
       LEFT JOIN "User" u ON u.id = t."createdById"
       LEFT JOIN "User" a ON a.id = t."assigneeId"
       WHERE t."boardId" = $1
       ORDER BY t."isDone" ASC, t."endAt" ASC`,
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

    values.push(id);
    const result = await pool.query(
      `UPDATE "Task" SET ${fields.join(", ")}, "updatedAt" = NOW() WHERE id = $${idx} RETURNING *`,
      values
    );

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
    await pool.query(`DELETE FROM "Task" WHERE id = $1`, [id]);
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

    const taskResult = await pool.query(`SELECT * FROM "Task" WHERE id = $1`, [id]);
    const task = taskResult.rows[0];
    if (!task) return res.status(404).json({ message: "Task not found" });

    const isNowDone = !task.isDone;
    const status = isNowDone ? "expired" : "pending";
    const doneAt = isNowDone ? new Date() : null;

    const updated = await pool.query(
      `UPDATE "Task" SET "isDone" = $1, "doneAt" = $2, status = $3, "updatedAt" = NOW() WHERE id = $4 RETURNING *`,
      [isNowDone, doneAt, status, id]
    );

    const completedTask = updated.rows[0];
    let nextTask = null;

    // Auto-create next occurrence when completing a recurring task
    if (isNowDone && task.recurringType && task.recurringType !== 'NONE') {
      const nextStart = shiftDate(task.startAt, task.recurringType);
      const nextEnd   = shiftDate(task.endAt,   task.recurringType);

      const nextResult = await pool.query(
        `INSERT INTO "Task"
           (id, "boardId", title, notes, "startAt", "endAt", priority, "assigneeId", "recurringType", "createdById", "createdAt", "updatedAt")
         VALUES
           (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
         RETURNING *`,
        [
          task.boardId, task.title, task.notes,
          nextStart, nextEnd,
          task.priority || 'MEDIUM',
          task.assigneeId || null,
          task.recurringType,
          task.createdById,
        ]
      );
      nextTask = nextResult.rows[0];
    }

    res.json({ task: completedTask, nextTask });
  } catch (error) {
    console.error("Toggle Task Error:", error);
    res.status(500).json({ message: "Failed to toggle task" });
  }
};

// ---------------- DUPLICATE TASK ----------------
exports.duplicateTask = async (req, res) => {
  try {
    const { id, boardId } = req.params;

    const taskResult = await pool.query(`SELECT * FROM "Task" WHERE id = $1 AND "boardId" = $2`, [id, boardId]);
    const task = taskResult.rows[0];
    if (!task) return res.status(404).json({ message: "Task not found" });

    // Shift dates by 1 day
    const newStart = shiftDate(task.startAt, 'DAILY');
    const newEnd   = shiftDate(task.endAt,   'DAILY');

    const result = await pool.query(
      `INSERT INTO "Task"
         (id, "boardId", title, notes, "startAt", "endAt", priority, "assigneeId", "recurringType", "createdById", "createdAt", "updatedAt")
       VALUES
         (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING *`,
      [
        task.boardId, task.title, task.notes,
        newStart, newEnd,
        task.priority || 'MEDIUM',
        task.assigneeId || null,
        task.recurringType || 'NONE',
        req.user.id,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Duplicate Task Error:", error);
    res.status(500).json({ message: "Failed to duplicate task" });
  }
};
