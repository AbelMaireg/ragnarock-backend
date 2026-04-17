/*
  Warnings:

  - The values [architecture] on the enum `DocumentationType` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "DocumentationStatus" AS ENUM ('draft', 'pending_review', 'completed', 'rejected');

-- AlterEnum
BEGIN;
CREATE TYPE "DocumentationType_new" AS ENUM ('brd', 'prd', 'frd', 'srs', 'srd', 'trd', 'sad', 'adr', 'hld', 'lld', 'icd', 'dbd', 'api', 'stp', 'std', 'rtm', 'ug', 'om', 'wbs', 'raci', 'note');
ALTER TABLE "public"."projectDocumentation" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "projectDocumentation" ALTER COLUMN "type" TYPE "DocumentationType_new" USING ("type"::text::"DocumentationType_new");
ALTER TYPE "DocumentationType" RENAME TO "DocumentationType_old";
ALTER TYPE "DocumentationType_new" RENAME TO "DocumentationType";
DROP TYPE "public"."DocumentationType_old";
ALTER TABLE "projectDocumentation" ALTER COLUMN "type" SET DEFAULT 'note';
COMMIT;

-- AlterTable
ALTER TABLE "projectDocumentation" ADD COLUMN     "status" "DocumentationStatus" NOT NULL DEFAULT 'draft';

-- CreateIndex
CREATE INDEX "projectDocumentation_projectId_status_idx" ON "projectDocumentation"("projectId", "status");

-- CreateIndex
CREATE INDEX "projectDocumentation_projectId_type_idx" ON "projectDocumentation"("projectId", "type");
