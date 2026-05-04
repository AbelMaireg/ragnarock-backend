-- CreateEnum
CREATE TYPE "AiChatMessageRole" AS ENUM ('user', 'assistant');

-- CreateTable
CREATE TABLE "projectAiChatSession" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projectAiChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projectAiChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "AiChatMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projectAiChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projectSpecification" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "chatSessionId" TEXT,
    "createdBy" TEXT NOT NULL,
    "title" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projectSpecification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projectAiChatSession_projectId_idx" ON "projectAiChatSession"("projectId");

-- CreateIndex
CREATE INDEX "projectAiChatSession_createdBy_idx" ON "projectAiChatSession"("createdBy");

-- CreateIndex
CREATE INDEX "projectAiChatMessage_sessionId_createdAt_idx" ON "projectAiChatMessage"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "projectSpecification_projectId_idx" ON "projectSpecification"("projectId");

-- CreateIndex
CREATE INDEX "projectSpecification_chatSessionId_idx" ON "projectSpecification"("chatSessionId");

-- CreateIndex
CREATE INDEX "projectSpecification_createdBy_idx" ON "projectSpecification"("createdBy");

-- AddForeignKey
ALTER TABLE "projectAiChatSession" ADD CONSTRAINT "projectAiChatSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projectAiChatSession" ADD CONSTRAINT "projectAiChatSession_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projectAiChatMessage" ADD CONSTRAINT "projectAiChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "projectAiChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projectSpecification" ADD CONSTRAINT "projectSpecification_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projectSpecification" ADD CONSTRAINT "projectSpecification_chatSessionId_fkey" FOREIGN KEY ("chatSessionId") REFERENCES "projectAiChatSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projectSpecification" ADD CONSTRAINT "projectSpecification_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
