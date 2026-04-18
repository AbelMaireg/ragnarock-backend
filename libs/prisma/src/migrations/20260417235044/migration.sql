/*
  Warnings:

  - The values [blocked] on the enum `TaskStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "TaskPhase" AS ENUM ('discovery', 'planning', 'build', 'test', 'release');

-- AlterEnum
BEGIN;
CREATE TYPE "TaskStatus_new" AS ENUM ('backlog', 'todo', 'in_progress', 'reviewing', 'reviewed', 'done', 'cancelled');
ALTER TABLE "public"."projectTask" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "projectTask" ALTER COLUMN "status" TYPE "TaskStatus_new" USING ("status"::text::"TaskStatus_new");
ALTER TYPE "TaskStatus" RENAME TO "TaskStatus_old";
ALTER TYPE "TaskStatus_new" RENAME TO "TaskStatus";
DROP TYPE "public"."TaskStatus_old";
ALTER TABLE "projectTask" ALTER COLUMN "status" SET DEFAULT 'todo';
COMMIT;

-- AlterTable
ALTER TABLE "projectTask" ADD COLUMN     "phase" "TaskPhase",
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "startDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "projectTask_projectId_status_sortOrder_idx" ON "projectTask"("projectId", "status", "sortOrder");
