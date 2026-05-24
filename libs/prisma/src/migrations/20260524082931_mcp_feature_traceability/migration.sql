/*
  Warnings:

  - A unique constraint covering the columns `[projectId,externalId]` on the table `projectRequirement` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "projectRequirement" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "featureId" TEXT;

-- AlterTable
ALTER TABLE "projectTask" ADD COLUMN     "featureId" TEXT;

-- CreateTable
CREATE TABLE "projectFeature" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "specificationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projectFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projectTestCase" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "featureId" TEXT,
    "externalId" TEXT,
    "title" TEXT NOT NULL,
    "testType" TEXT NOT NULL,
    "preconditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "steps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expectedResult" TEXT NOT NULL,
    "requirementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projectTestCase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projectFeature_projectId_idx" ON "projectFeature"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "projectFeature_projectId_externalId_key" ON "projectFeature"("projectId", "externalId");

-- CreateIndex
CREATE INDEX "projectTestCase_projectId_idx" ON "projectTestCase"("projectId");

-- CreateIndex
CREATE INDEX "projectTestCase_featureId_idx" ON "projectTestCase"("featureId");

-- CreateIndex
CREATE UNIQUE INDEX "projectTestCase_projectId_externalId_key" ON "projectTestCase"("projectId", "externalId");

-- CreateIndex
CREATE INDEX "projectRequirement_featureId_idx" ON "projectRequirement"("featureId");

-- CreateIndex
CREATE UNIQUE INDEX "projectRequirement_projectId_externalId_key" ON "projectRequirement"("projectId", "externalId");

-- CreateIndex
CREATE INDEX "projectTask_featureId_idx" ON "projectTask"("featureId");

-- AddForeignKey
ALTER TABLE "projectFeature" ADD CONSTRAINT "projectFeature_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projectTestCase" ADD CONSTRAINT "projectTestCase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projectTestCase" ADD CONSTRAINT "projectTestCase_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "projectFeature"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projectTask" ADD CONSTRAINT "projectTask_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "projectFeature"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projectRequirement" ADD CONSTRAINT "projectRequirement_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "projectFeature"("id") ON DELETE SET NULL ON UPDATE CASCADE;
