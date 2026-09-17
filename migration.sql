-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================================
-- USERS
-- ==========================================================
CREATE TABLE "User" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  country TEXT,
  phone TEXT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  "emailVerifiedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- ==========================================================
-- SUBSCRIPTIONS
-- ==========================================================
CREATE TABLE "Subscription" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  plan TEXT NOT NULL,
  status TEXT DEFAULT 'TRIAL',
  "memberCount" INT DEFAULT 0,
  "monthlyPrice" FLOAT DEFAULT 0.0,
  "trialEndsAt" TIMESTAMP,
  "nextBillingDate" TIMESTAMP,
  "paystackCustomerId" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_subscription_user FOREIGN KEY ("userId")
    REFERENCES "User"(id) ON DELETE CASCADE
);

-- ==========================================================
-- VERIFICATION TOKENS
-- ==========================================================
CREATE TABLE "VerificationToken" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  "userId" UUID NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "usedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_verification_user FOREIGN KEY ("userId")
    REFERENCES "User"(id) ON DELETE CASCADE
);

-- ==========================================================
-- PASSWORD RESET TOKENS
-- ==========================================================
CREATE TABLE "PasswordResetToken" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  "userId" UUID NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "usedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_passwordreset_user FOREIGN KEY ("userId")
    REFERENCES "User"(id) ON DELETE CASCADE
);

-- ==========================================================
-- BOARDS
-- ==========================================================
CREATE TABLE "Board" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  "ownerId" UUID NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_board_owner FOREIGN KEY ("ownerId")
    REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE INDEX idx_board_owner ON "Board"("ownerId");

-- ==========================================================
-- BOARD MEMBERS
-- ==========================================================
CREATE TYPE "BoardRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

CREATE TABLE "BoardMember" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "boardId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  role "BoardRole" NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_boardmember_board FOREIGN KEY ("boardId")
    REFERENCES "Board"(id) ON DELETE CASCADE,
  CONSTRAINT fk_boardmember_user FOREIGN KEY ("userId")
    REFERENCES "User"(id) ON DELETE CASCADE,
  CONSTRAINT uq_boardmember UNIQUE ("boardId", "userId")
);

CREATE INDEX idx_boardmember_user_board ON "BoardMember"("userId", "boardId");

-- ==========================================================
-- TASKS
-- ==========================================================
CREATE TABLE "Task" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "boardId" UUID NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  "startAt" TIMESTAMP NOT NULL,
  "endAt" TIMESTAMP NOT NULL,
  "isDone" BOOLEAN DEFAULT FALSE,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  "doneAt" TIMESTAMP,
  status TEXT DEFAULT 'pending',
  CONSTRAINT fk_task_board FOREIGN KEY ("boardId")
    REFERENCES "Board"(id) ON DELETE CASCADE,
  CONSTRAINT fk_task_creator FOREIGN KEY ("createdById")
    REFERENCES "User"(id)
);

CREATE INDEX idx_task_board ON "Task"("boardId");
CREATE INDEX idx_task_creator ON "Task"("createdById");

-- ==========================================================
-- NOTIFICATIONS (NEW)
-- ==========================================================
CREATE TABLE "Notification" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "boardId" UUID NOT NULL,
  "taskId" UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  "isRead" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_notification_user FOREIGN KEY ("userId")
    REFERENCES "User"(id) ON DELETE CASCADE,
  CONSTRAINT fk_notification_board FOREIGN KEY ("boardId")
    REFERENCES "Board"(id) ON DELETE CASCADE,
  CONSTRAINT fk_notification_task FOREIGN KEY ("taskId")
    REFERENCES "Task"(id) ON DELETE CASCADE
);

CREATE INDEX idx_notification_user ON "Notification"("userId");
CREATE INDEX idx_notification_board ON "Notification"("boardId");
CREATE INDEX idx_notification_task ON "Notification"("taskId");

-- ==========================================================
-- FRIENDS
-- ==========================================================
CREATE TABLE "FriendRequest" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT uq_friend_request UNIQUE (sender_id, receiver_id)
);

CREATE TABLE "Friendship" (
  user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, friend_id)
);

CREATE INDEX idx_friendrequest_receiver ON "FriendRequest"(receiver_id);

-- ==========================================================
-- MESSAGING
-- ==========================================================
CREATE TABLE "Conversation" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "ConversationParticipant" (
  "conversationId" UUID NOT NULL REFERENCES "Conversation"(id) ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  PRIMARY KEY ("conversationId", "userId")
);

CREATE TABLE "Message" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversationId" UUID NOT NULL REFERENCES "Conversation"(id) ON DELETE CASCADE,
  "authorId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  "isRead" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_message_conv ON "Message"("conversationId");

-- ==========================================================
-- TASK COMMENTS
-- ==========================================================
CREATE TABLE IF NOT EXISTS "TaskComment" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "taskId" UUID NOT NULL,
  "authorId" UUID NOT NULL,
  content TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_taskcomment_task FOREIGN KEY ("taskId")
    REFERENCES "Task"(id) ON DELETE CASCADE,
  CONSTRAINT fk_taskcomment_author FOREIGN KEY ("authorId")
    REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_taskcomment_task ON "TaskComment"("taskId");

-- ==========================================================
-- ENUMS (SUBSCRIPTION TYPES)
-- ==========================================================
CREATE TYPE "SubscriptionPlan" AS ENUM ('BASIC', 'TEAM');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'TRIAL');
