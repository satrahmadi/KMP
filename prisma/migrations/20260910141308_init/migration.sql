-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "emailVerifiedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'unverified',
    "isSuperadmin" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "lastActiveCompanyId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "suspendedAt" DATETIME,
    "suspendedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Company_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Company_suspendedById_fkey" FOREIGN KEY ("suspendedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompanyMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "invitedBy" TEXT,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompanyMember_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CompanyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CompanyMember_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invitation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invitation_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Otp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Role_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    PRIMARY KEY ("roleId", "permissionId"),
    CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "companyId" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyMember_companyId_userId_key" ON "CompanyMember"("companyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Role_companyId_name_key" ON "Role"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");
