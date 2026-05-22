-- AlterTable
ALTER TABLE "project" ADD COLUMN     "draftSrs" JSONB,
ADD COLUMN     "draftSrsProgress" INTEGER NOT NULL DEFAULT 0;
