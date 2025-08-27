const prisma = require('../../config/prisma');

exports.createBoard = async (req, res) => {
  const board = await prisma.board.create({
    data: { name: req.body.name, ownerId: req.user.id },
  });
  res.status(201).json(board);
};

exports.listBoards = async (req, res) => {
  const userId = req.user.id;
  const boards = await prisma.board.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } }
      ]
    },
    include: { members: { select: { userId: true, role: true } } }
  });
  res.json(boards);
};

exports.getBoard = async (req, res) => {
  const board = await prisma.board.findUnique({
    where: { id: req.params.id },
    include: { members: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } } }
  });
  if (!board) return res.status(404).json({ message: 'Not found' });
  res.json(board);
};

exports.renameBoard = async (req, res) => {
  const board = await prisma.board.update({
    where: { id: req.params.id },
    data: { name: req.body.name },
  });
  res.json(board);
};

exports.deleteBoard = async (req, res) => {
  await prisma.board.delete({ where: { id: req.params.id } });
  res.status(204).send();
};

exports.shareBoard = async (req, res) => {
  const { email, role } = req.body;
  const boardId = req.params.id;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ message: 'User with that email not found' });

  const membership = await prisma.boardMember.upsert({
    where: { boardId_userId: { boardId, userId: user.id } },
    create: { boardId, userId: user.id, role },
    update: { role },
  });

  res.json({ message: 'Shared', membership });
};

exports.listMembers = async (req, res) => {
  const boardId = req.params.id;
  const members = await prisma.boardMember.findMany({
    where: { boardId },
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } }
  });
  res.json(members);
};

// ===== New Methods ===== //

// Remove a member from a board (OWNER only)
exports.removeMember = async (req, res) => {
  const { id: boardId, memberId: userId } = req.params;
  await prisma.boardMember.delete({
    where: { boardId_userId: { boardId, userId } }
  });
  res.json({ message: 'Member removed' });
};

// Change a member's role (OWNER only)
exports.changeMemberRole = async (req, res) => {
  const { id: boardId, memberId: userId } = req.params;
  const { role } = req.body;

  const membership = await prisma.boardMember.update({
    where: { boardId_userId: { boardId, userId } },
    data: { role },
  });

  res.json({ message: 'Role updated', membership });
};
