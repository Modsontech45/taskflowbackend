-- Run this if the TaskComment table doesn't exist yet
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
