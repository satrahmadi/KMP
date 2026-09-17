import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
(async () => {
  const member = await db.role.findFirst({
    where: { companyId: null, type: "system", name: "Member" },
    include: { permissions: { include: { permission: true } } },
  });
  const projectPerms = member!.permissions.map((p) => p.permission.key).filter((k) => k.startsWith("project."));
  console.log("Member project perms:", projectPerms);
  const admin = await db.role.findFirst({
    where: { companyId: null, type: "system", name: "Admin" },
    include: { permissions: { include: { permission: true } } },
  });
  const adminProjectPerms = admin!.permissions.map((p) => p.permission.key).filter((k) => k.startsWith("project."));
  console.log("Admin project perms:", adminProjectPerms);
  await db.$disconnect();
})();
