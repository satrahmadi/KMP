-- AlterTable
ALTER TABLE "Project" ADD COLUMN "classification" TEXT;
ALTER TABLE "Project" ADD COLUMN "costCenter" TEXT;

-- CreateTable
CREATE TABLE "Donor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'other',
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Donor_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Donor_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DonorContact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "donorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "position" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DonorContact_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "Donor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DonorAgreement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "donorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" REAL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "referenceUrl" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DonorAgreement_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "Donor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DonorAgreement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Currency" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT,
    "isBase" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Currency_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Currency_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "currencyId" TEXT NOT NULL,
    "rate" REAL NOT NULL,
    "effectiveDate" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExchangeRate_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ExchangeRate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "type" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Program_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Program_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProgramCodeSeq" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "seq" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProgramCodeSeq_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Donor_companyId_name_key" ON "Donor"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Currency_companyId_code_key" ON "Currency"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Program_companyId_code_key" ON "Program"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramCodeSeq_companyId_category_year_key" ON "ProgramCodeSeq"("companyId", "category", "year");
