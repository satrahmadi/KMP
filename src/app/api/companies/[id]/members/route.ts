import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireCompanyContext, can, CompanySuspendedError, NotMemberError } from "@/lib/rbac";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET(_req: Request, ctx: RouteContext<"/api/companies/[id]/members">) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return jsonError("Belum login.", 401);

  let company;
  try {
    company = await requireCompanyContext(session.user.id, id);
  } catch (err) {
    if (err instanceof NotMemberError) return jsonError("Bukan anggota company ini.", 403);
    if (err instanceof CompanySuspendedError) return jsonError("Company ini sedang dinonaktifkan.", 403);
    throw err;
  }
  if (!can(company, "team_management.view_members")) return jsonError("Tidak memiliki izin.", 403);

  const [members, invitations] = await Promise.all([
    db.companyMember.findMany({
      where: { companyId: id, status: "active" },
      include: { user: true, role: true },
      orderBy: { joinedAt: "asc" },
    }),
    db.invitation.findMany({
      where: { companyId: id },
      include: { role: true, invitedBy: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return jsonOk({
    members: members.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      roleId: m.roleId,
      roleName: m.role.name,
      roleType: m.role.type,
      joinedAt: m.joinedAt,
    })),
    invitations: invitations.map((i) => ({
      id: i.id,
      email: i.email,
      roleId: i.roleId,
      roleName: i.role.name,
      status: i.status,
      invitedByName: i.invitedBy.name,
      expiresAt: i.expiresAt,
      createdAt: i.createdAt,
    })),
    canInvite: can(company, "team_management.invite_member"),
    canRemove: can(company, "team_management.remove_member"),
    canManageRoles: can(company, "team_management.manage_roles"),
  });
}
