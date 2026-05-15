-- CreateEnum
CREATE TYPE "ProjectPersona" AS ENUM ('business_owner', 'developer', 'qa_engineer', 'project_manager', 'stakeholder');

-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('requirements', 'developer_advisor');

-- AlterTable
ALTER TABLE "projectAiChatSession" ADD COLUMN     "agentType" "AgentType" NOT NULL DEFAULT 'requirements';

-- AlterTable
ALTER TABLE "projectMember" ADD COLUMN     "persona" "ProjectPersona";
