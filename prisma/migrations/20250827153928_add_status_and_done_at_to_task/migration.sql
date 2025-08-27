-- AlterTable
ALTER TABLE "public"."Task" ADD COLUMN     "doneAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending';
