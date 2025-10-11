const client = require("../../config/db"); // adjust your path
const { sendMail } = require("../../config/mailer");
const { createNotification } = require("./controller");

exports.notifyBoardMembersOfNewTask = async ({ boardId, task, creatorId }) => {
  try {
    // Get board name
    const { rows: boardRows } = await client.query(
      `SELECT name FROM "Board" WHERE id = $1`,
      [boardId]
    );
    console.log(boardRows);
    if (!boardRows.length) return;
    const boardName = boardRows[0].name;
    // Get all members of this board including creator
    const { rows: members } = await client.query(
      `SELECT u.id, u.email, u."firstName"
   FROM "BoardMember" bm
   JOIN "User" u ON u.id = bm."userId"
   WHERE bm."boardId" = $1`,
      [boardId]
    );

    // // Get all members of this board except creator
    // const { rows: members } = await client.query(
    //   `SELECT u.id, u.email
    //    FROM "BoardMember" bm
    //    JOIN "User" u ON u.id = bm."userId"
    //    WHERE bm."boardId" = $1 AND u.id != $2`,
    //   [boardId, creatorId]
    // );

    console.log(members);
    if (!members.length) return;

    for (const member of members) {
      // save notification
      await createNotification(
        member.id,
        boardId,
        task.id,
        "New Task Created",
        `A new task "${task.title}" has been added to the board "${boardName}".`
      );

      // send email
      // Also trigger email sending (short & simple)
      await sendMail({
        to: member.email,
        subject: `New Task in ${boardName}`,
        html: `
    <div style="
      font-family: Arial, sans-serif;
      background: #f8f9fa;
      padding: 20px;
      color: #333;
      line-height: 1.6;
    ">
      <h2 style="margin-bottom: 10px;">New Task Created [${task.title?.slice(
        0,
        20
      )}${task.title?.length > 20 ? "..." : ""}]</h2>
      <p>Hello ${member.firstName || ""},</p>
      <p>A new task is now available on the <strong>${boardName}</strong> board.</p>
      <p>
        You can view it here:
        <a href="${process.env.APP_URL}/boards/${boardId}"
           style="color: #007bff; text-decoration: none;">
          View Board
        </a>
      </p>
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
      <small>This is an automated message from TaskNet.</small>
    </div>
  `,
      }).catch((err) => {
        console.error(`Email failed for ${member.email}:`, err.message);
      });
    }
  } catch (err) {
    console.error("Notification Service Error:", err);
  }
};
