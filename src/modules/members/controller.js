const prisma = require('../../config/prisma'); // adjust path if needed

// Fetch all members of a board added by the owner
async function listMembers(req, res) {
  const { boardId } = req.params;

  try {
    const members = await prisma.boardMember.findMany({
      where: { boardId },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ members });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch members' });
  }
}

// Add a member to a board
// controller.js
async function addMember(req, res) {
  const { boardId } = req.params;
  const { userId: userEmail, role } = req.body; // userId here is actually email

  if (!boardId) return res.status(400).json({ message: 'Missing board id' });
  if (!userEmail || !role) return res.status(400).json({ message: 'Missing user or role' });

  try {
    // 1. Find the user by email
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) return res.status(404).json({ message: 'User not found' });

    // 2. Create the board member using the real userId
    const newMember = await prisma.boardMember.create({
      data: {
        boardId,
        userId: user.id,   // <-- real UUID
        role,
      },
    });

    return res.json({
      id: newMember.id,
      userId: newMember.userId,
      role: newMember.role,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
}


// Update a member's role
async function updateMemberRole(req, res) {
  const { boardId, userId } = req.params;
  const { role } = req.body;

  if (!role) return res.status(400).json({ message: 'role is required' });

  try {
    const updatedMember = await prisma.boardMember.update({
      where: { boardId_userId: { boardId, userId } },
      data: { role },
      select: {
        id: true,
        role: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    res.json(updatedMember);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update member role' });
  }
}

// Remove a member from a board
async function removeMember(req, res) {
  const { boardId, userId } = req.params;

  try {
    await prisma.boardMember.delete({
      where: { boardId_userId: { boardId, userId } },
    });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to remove member' });
  }
}

module.exports = {
  listMembers,
  addMember,
  updateMemberRole,
  removeMember,
};
