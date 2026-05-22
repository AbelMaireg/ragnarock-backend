-- CreateTable
CREATE TABLE "ragnarockChatMessage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "detectedAction" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ragnarockChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ragnarockChatMessage_projectId_userId_createdAt_idx" ON "ragnarockChatMessage"("projectId", "userId", "createdAt");

-- AddForeignKey
ALTER TABLE "ragnarockChatMessage" ADD CONSTRAINT "ragnarockChatMessage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ragnarockChatMessage" ADD CONSTRAINT "ragnarockChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
