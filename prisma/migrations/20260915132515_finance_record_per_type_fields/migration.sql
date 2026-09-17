-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FinanceRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "donorId" TEXT,
    "amount" REAL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "recordDate" DATETIME,
    "periodStart" DATETIME,
    "periodEnd" DATETIME,
    "invoiceNumber" TEXT,
    "dueDate" DATETIME,
    "description" TEXT,
    "referenceUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FinanceRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FinanceRecord_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "Donor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FinanceRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_FinanceRecord" ("amount", "createdAt", "createdById", "currency", "description", "id", "projectId", "recordDate", "referenceUrl", "status", "title", "type", "updatedAt") SELECT "amount", "createdAt", "createdById", "currency", "description", "id", "projectId", "recordDate", "referenceUrl", "status", "title", "type", "updatedAt" FROM "FinanceRecord";
DROP TABLE "FinanceRecord";
ALTER TABLE "new_FinanceRecord" RENAME TO "FinanceRecord";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
