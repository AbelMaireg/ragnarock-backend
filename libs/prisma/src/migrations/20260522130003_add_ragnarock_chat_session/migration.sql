-- CreateTable
CREATE TABLE "ragnarockChatSession" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New chat',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ragnarockChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ragnarockChatSession_projectId_userId_createdAt_idx" ON "ragnarockChatSession"("projectId", "userId", "createdAt");

-- AddForeignKey
ALTER TABLE "ragnarockChatSession" ADD CONSTRAINT "ragnarockChatSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ragnarockChatSession" ADD CONSTRAINT "ragnarockChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing messages: create one legacy session per (projectId, userId) pair
INSERT INTO "ragnarockChatSession" ("id", "projectId", "userId", "title", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    "projectId",
    "userId",
    'Previous chat',
    MIN("createdAt"),
    NOW()
FROM "ragnarockChatMessage"
GROUP BY "projectId", "userId";

-- AlterTable: add sessionId with a temporary default, then fill, then make NOT NULL
ALTER TABLE "ragnarockChatMessage" ADD COLUMN "sessionId" TEXT;

UPDATE "ragnarockChatMessage" m
SET "sessionId" = s."id"
FROM "ragnarockChatSession" s
WHERE s."projectId" = m."projectId" AND s."userId" = m."userId";

ALTER TABLE "ragnarockChatMessage" ALTER COLUMN "sessionId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "ragnarockChatMessage_sessionId_createdAt_idx" ON "ragnarockChatMessage"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "ragnarockChatMessage" ADD CONSTRAINT "ragnarockChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ragnarockChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
