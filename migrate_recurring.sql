-- Run this in the Neon SQL console to enable recurring tasks
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "recurringType" TEXT DEFAULT 'NONE';
