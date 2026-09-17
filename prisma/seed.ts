import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PERMISSION_CATALOG } from "../src/lib/permissions";

const db = new PrismaClient();

async function main() {
  // 1. Permission catalog — upsert so re-running the seed after adding a new
  //    module/action never touches existing Role/RolePermission rows.
  for (const p of PERMISSION_CATALOG) {
    await db.permission.upsert({
      where: { key: p.key },
      update: { label: p.label, description: p.description, module: p.module, action: p.action },
      create: { key: p.key, module: p.module, action: p.action, label: p.label, description: p.description },
    });
  }
  console.log(`Seeded ${PERMISSION_CATALOG.length} permissions.`);

  // 2. System roles — global (companyId = null), created once.
  //    (Composite unique filters don't reliably match NULL, so look these up by
  //    type+name instead of upserting on the [companyId, name] key.)
  async function ensureSystemRole(name: string, description: string) {
    const found = await db.role.findFirst({ where: { companyId: null, type: "system", name } });
    if (found) return found;
    return db.role.create({ data: { companyId: null, name, type: "system", description } });
  }
  const adminRole = await ensureSystemRole("Admin", "Akses penuh ke seluruh modul.");
  const memberRole = await ensureSystemRole("Member", "Akses view-only ke seluruh modul.");

  const allPermissions = await db.permission.findMany();
  for (const perm of allPermissions) {
    const def = PERMISSION_CATALOG.find((p) => p.key === perm.key)!;
    if (def.defaultAdmin) {
      await db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: adminRole.id, permissionId: perm.id },
      });
    }
    if (def.defaultMember) {
      await db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: memberRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: memberRole.id, permissionId: perm.id },
      });
    }
  }
  console.log("Seeded system roles: Admin, Member.");

  // 3. Superadmin — provisioned directly, never via public signup (FR-9).
  const superadminEmail = "superadmin@kmp.local";
  const existing = await db.user.findUnique({ where: { email: superadminEmail } });
  if (!existing) {
    await db.user.create({
      data: {
        name: "Platform Superadmin",
        email: superadminEmail,
        passwordHash: await bcrypt.hash("SuperAdmin123", 10),
        status: "active",
        isSuperadmin: true,
        emailVerifiedAt: new Date(),
      },
    });
    console.log(`Seeded Superadmin account: ${superadminEmail} / SuperAdmin123`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
