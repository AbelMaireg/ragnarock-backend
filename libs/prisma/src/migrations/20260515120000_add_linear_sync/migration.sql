-- CreateEnum
CREATE TYPE "LinearSyncDirection" AS ENUM ('import', 'export', 'bidirectional');

-- CreateEnum
CREATE TYPE "LinearSyncRunType" AS ENUM ('import', 'export', 'sync');

-- CreateEnum
CREATE TYPE "LinearSyncRunStatus" AS ENUM ('pending', 'running', 'completed', 'failed', 'partial');

-- CreateEnum
CREATE TYPE "LinearProjectSyncStatus" AS ENUM ('idle', 'syncing', 'error');

-- AlterTable
ALTER TABLE "projectTask" ADD COLUMN IF NOT EXISTS "labels" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "linearProjectMapping" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "linearProjectId" TEXT NOT NULL,
    "linearTeamId" TEXT NOT NULL,
    "linearProjectName" TEXT,
    "defaultLinearStateId" TEXT,
    "stateMap" JSONB,
    "lastSyncCursor" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "lastImportAt" TIMESTAMP(3),
    "lastExportAt" TIMESTAMP(3),
    "syncStatus" "LinearProjectSyncStatus" NOT NULL DEFAULT 'idle',
    "lastSyncError" TEXT,
    "autoSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "linearProjectMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "linearIssueLink" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectTaskId" TEXT NOT NULL,
    "linearIssueId" TEXT NOT NULL,
    "linearIssueIdentifier" TEXT,
    "linearUpdatedAt" TIMESTAMP(3),
    "localUpdatedAt" TIMESTAMP(3),
    "syncDirection" "LinearSyncDirection",
    "importedFromLinear" BOOLEAN NOT NULL DEFAULT false,
    "syncedToLinear" BOOLEAN NOT NULL DEFAULT false,
    "externalSource" TEXT NOT NULL DEFAULT 'linear',
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "linearStateId" TEXT,
    "labelIds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "linearIssueLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "linearSyncRun" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "LinearSyncRunType" NOT NULL,
    "status" "LinearSyncRunStatus" NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "stats" JSONB,
    "error" TEXT,

    CONSTRAINT "linearSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "linearProjectMapping_projectId_key" ON "linearProjectMapping"("projectId");

-- CreateIndex
CREATE INDEX "linearProjectMapping_linearProjectId_idx" ON "linearProjectMapping"("linearProjectId");

-- CreateIndex
CREATE INDEX "linearProjectMapping_autoSyncEnabled_syncStatus_idx" ON "linearProjectMapping"("autoSyncEnabled", "syncStatus");

-- CreateIndex
CREATE UNIQUE INDEX "linearIssueLink_projectTaskId_key" ON "linearIssueLink"("projectTaskId");

-- CreateIndex
CREATE INDEX "linearIssueLink_projectId_idx" ON "linearIssueLink"("projectId");

-- CreateIndex
CREATE INDEX "linearIssueLink_linearIssueId_idx" ON "linearIssueLink"("linearIssueId");

-- CreateIndex
CREATE INDEX "linearIssueLink_lastSyncedAt_idx" ON "linearIssueLink"("lastSyncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "linearIssueLink_projectId_linearIssueId_key" ON "linearIssueLink"("projectId", "linearIssueId");

-- CreateIndex
CREATE INDEX "linearSyncRun_projectId_startedAt_idx" ON "linearSyncRun"("projectId", "startedAt" DESC);

-- AddForeignKey
ALTER TABLE "linearProjectMapping" ADD CONSTRAINT "linearProjectMapping_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linearIssueLink" ADD CONSTRAINT "linearIssueLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linearIssueLink" ADD CONSTRAINT "linearIssueLink_projectTaskId_fkey" FOREIGN KEY ("projectTaskId") REFERENCES "projectTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linearSyncRun" ADD CONSTRAINT "linearSyncRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
