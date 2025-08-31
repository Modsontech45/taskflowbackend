const { subscriptionService } = require('../services/subscriptionService');
const { prisma } = require('../prisma/client'); // adjust path if your prisma client is located elsewhere

const subscriptionHooks = {
  // Hook called when board member is added
  async onMemberAdded(boardId, userId) {
    try {
      // Get board owner
      const board = await prisma.board.findUnique({
        where: { id: boardId },
        select: { ownerId: true },
      });

      if (!board) return;

      // Get current member count for the owner
      const memberCount = await prisma.boardMember.count({
        where: {
          board: { ownerId: board.ownerId },
        },
      });

      // Update subscription member count
      await subscriptionService.updateMemberCount(board.ownerId, memberCount);

      console.log(`📊 Updated member count to ${memberCount} for user ${board.ownerId}`);
    } catch (error) {
      console.error('❌ Error updating member count:', error);
    }
  },

  // Hook called when board member is removed
  async onMemberRemoved(boardId, userId) {
    try {
      // Get board owner
      const board = await prisma.board.findUnique({
        where: { id: boardId },
        select: { ownerId: true },
      });

      if (!board) return;

      // Get current member count for the owner
      const memberCount = await prisma.boardMember.count({
        where: {
          board: { ownerId: board.ownerId },
        },
      });

      // Update subscription member count
      await subscriptionService.updateMemberCount(board.ownerId, memberCount);

      console.log(`📊 Updated member count to ${memberCount} for user ${board.ownerId}`);
    } catch (error) {
      console.error('❌ Error updating member count:', error);
    }
  },
};

module.exports = { subscriptionHooks };
