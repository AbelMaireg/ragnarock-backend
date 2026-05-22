/*
  Warnings:

  - The `agentType` column on the `projectAiChatSession` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `persona` on the `projectMember` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AgentMode" AS ENUM ('conversational', 'one_shot');

-- AlterTable
ALTER TABLE "projectAiChatSession" DROP COLUMN "agentType",
ADD COLUMN     "agentType" TEXT NOT NULL DEFAULT 'requirements';

-- AlterTable
ALTER TABLE "projectDocumentation" ADD COLUMN     "generationMode" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN     "sourceAgentKey" TEXT;

-- AlterTable
ALTER TABLE "projectMember" DROP COLUMN "persona",
ADD COLUMN     "personas" "ProjectPersona"[];

-- DropEnum
DROP TYPE "AgentType";

-- CreateTable
CREATE TABLE "agentDefinition" (
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "persona" TEXT NOT NULL,
    "sdlcPhase" TEXT NOT NULL,
    "mode" "AgentMode" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agentDefinition_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "projectDocumentation_sourceAgentKey_idx" ON "projectDocumentation"("sourceAgentKey");

-- AddForeignKey
ALTER TABLE "projectAiChatSession" ADD CONSTRAINT "projectAiChatSession_agentType_fkey" FOREIGN KEY ("agentType") REFERENCES "agentDefinition"("key") ON DELETE RESTRICT ON UPDATE CASCADE;
