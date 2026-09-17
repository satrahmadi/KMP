/*
  Warnings:

  - Added the required column `code` to the `Project` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "FinanceRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" REAL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "recordDate" DATETIME,
    "description" TEXT,
    "referenceUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FinanceRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FinanceRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "suspendedAt" DATETIME,
    "suspendedById" TEXT,
    "projectSeq" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Company_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Company_suspendedById_fkey" FOREIGN KEY ("suspendedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Company" ("createdAt", "createdById", "id", "name", "slug", "status", "suspendedAt", "suspendedById") SELECT "createdAt", "createdById", "id", "name", "slug", "status", "suspendedAt", "suspendedById" FROM "Company";
DROP TABLE "Company";
ALTER TABLE "new_Company" RENAME TO "Company";
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Project_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
-- Backfill `code` for pre-existing rows: sequential per companyId in creation order,
-- matching the PRJ-0001-style numbering new rows get from the app (see
-- PRD-Company-Switching-Project-Module.md §13).
INSERT INTO "new_Project" ("companyId", "code", "createdAt", "createdById", "description", "id", "name", "slug", "status", "updatedAt")
SELECT
  "companyId",
  'PRJ-' || substr('0000' || CAST(ROW_NUMBER() OVER (PARTITION BY "companyId" ORDER BY "createdAt", "id") AS TEXT), -4, 4),
  "createdAt", "createdById", "description", "id", "name", "slug", "status", "updatedAt"
FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE UNIQUE INDEX "Project_companyId_slug_key" ON "Project"("companyId", "slug");
CREATE UNIQUE INDEX "Project_companyId_code_key" ON "Project"("companyId", "code");

-- Keep Company.projectSeq (the atomic counter new Project codes increment from) in
-- sync with the codes just backfilled above, so the next Project created continues
-- the sequence instead of colliding with an existing code.
UPDATE "Company" SET "projectSeq" = (
  SELECT COUNT(*) FROM "Project" WHERE "Project"."companyId" = "Company"."id"
);
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
