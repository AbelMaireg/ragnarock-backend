-- CreateTable
CREATE TABLE "projectRepository" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "githubRepoId" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "description" TEXT,
    "visibility" TEXT NOT NULL,
    "defaultBranch" TEXT NOT NULL,
    "htmlUrl" TEXT NOT NULL,
    "stargazersCount" INTEGER NOT NULL DEFAULT 0,
    "pushedAt" TIMESTAMP(3),
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linkedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projectRepository_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projectRepository_projectId_idx" ON "projectRepository"("projectId");

-- CreateIndex
CREATE INDEX "projectRepository_linkedByUserId_idx" ON "projectRepository"("linkedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "projectRepository_projectId_githubRepoId_key" ON "projectRepository"("projectId", "githubRepoId");

-- AddForeignKey
ALTER TABLE "projectRepository" ADD CONSTRAINT "projectRepository_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projectRepository" ADD CONSTRAINT "projectRepository_linkedByUserId_fkey" FOREIGN KEY ("linkedByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
