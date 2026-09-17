import "server-only";
import { db } from "@/lib/db";

/** All permission keys granted to a role, via Role -> RolePermission -> Permission. */
export async function getRolePermissionKeys(roleId: string): Promise<Set<string>> {
  const rows = await db.rolePermission.findMany({
    where: { roleId },
    include: { permission: true },
  });
  return new Set(rows.map((r) => r.permission.key));
}

export type CompanyContext = {
  companyId: string;
  companyName: string;
  companyStatus: "active" | "suspended";
  memberId: string;
  roleId: string;
  roleName: string;
  roleType: "system" | "custom";
  permissions: Set<string>;
};

export class CompanySuspendedError extends Error {}
export class NotMemberError extends Error {}

/** Resolves the caller's membership + effective permissions for a company. Throws on isolation/suspension violations. */
export async function requireCompanyContext(userId: string, companyId: string): Promise<CompanyContext> {
  const member = await db.companyMember.findUnique({
    where: { companyId_userId: { companyId, userId } },
    include: { company: true, role: true },
  });

  if (!member || member.status !== "active") throw new NotMemberError();
  if (member.company.status === "suspended") throw new CompanySuspendedError();

  const permissions = await getRolePermissionKeys(member.roleId);

  return {
    companyId,
    companyName: member.company.name,
    companyStatus: member.company.status,
    memberId: member.id,
    roleId: member.roleId,
    roleName: member.role.name,
    roleType: member.role.type,
    permissions,
  };
}

export function can(ctx: CompanyContext, permissionKey: string) {
  return ctx.permissions.has(permissionKey);
}

/** Counts active members holding the System Role "Admin" in a company — used to block removing the last Admin. */
export async function countActiveAdmins(companyId: string) {
  return db.companyMember.count({
    where: {
      companyId,
      status: "active",
      role: { type: "system", name: "Admin" },
    },
  });
}
