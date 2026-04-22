-- CreateEnum
CREATE TYPE "IntegrationProviderKey" AS ENUM ('linear', 'figma', 'cursor_workspace');

-- CreateEnum
CREATE TYPE "IntegrationConnectionStatus" AS ENUM ('active', 'error', 'disconnected', 'pending');

-- CreateEnum
CREATE TYPE "IntegrationAuthMode" AS ENUM ('pat', 'oauth2', 'api_key');

-- CreateTable
CREATE TABLE "integrationConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "IntegrationProviderKey" NOT NULL,
    "authMode" "IntegrationAuthMode" NOT NULL DEFAULT 'pat',
    "status" "IntegrationConnectionStatus" NOT NULL DEFAULT 'pending',
    "encryptedCredentials" TEXT NOT NULL,
    "lastError" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrationConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT,
    "bodyMarkdown" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "integrationConnection_organizationId_idx" ON "integrationConnection"("organizationId");

-- CreateIndex
CREATE INDEX "integrationConnection_createdByUserId_idx" ON "integrationConnection"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "integrationConnection_organizationId_provider_key" ON "integrationConnection"("organizationId", "provider");

-- CreateIndex
CREATE INDEX "skill_projectId_idx" ON "skill"("projectId");

-- CreateIndex
CREATE INDEX "skill_createdBy_idx" ON "skill"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "skill_projectId_slug_key" ON "skill"("projectId", "slug");

-- AddForeignKey
ALTER TABLE "integrationConnection" ADD CONSTRAINT "integrationConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrationConnection" ADD CONSTRAINT "integrationConnection_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill" ADD CONSTRAINT "skill_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill" ADD CONSTRAINT "skill_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
