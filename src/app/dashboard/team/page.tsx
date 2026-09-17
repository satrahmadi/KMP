import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { requireCompanyContext, can } from "@/lib/rbac";
import { TeamView } from "./team-view";

export default async function TeamPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.companyId) redirect("/dashboard");

  const company = await requireCompanyContext(session.user.id, session.companyId);
  if (!can(company, "team_management.view_members")) redirect("/dashboard");

  const [members, invitations, roles] = await Promise.all([
    db.companyMember.findMany({
      where: { companyId: session.companyId, status: "active" },
      include: { user: true, role: true },
      orderBy: { joinedAt: "asc" },
    }),
    db.invitation.findMany({
      where: { companyId: session.companyId },
      include: { role: true, invitedBy: true },
      orderBy: { createdAt: "desc" },
    }),
    db.role.findMany({
      where: { OR: [{ companyId: null }, { companyId: session.companyId }] },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
  ]);

  const adminCount = members.filter((m) => m.role.type === "system" && m.role.name === "Admin").length;

  return (
    <TeamView
      companyId={session.companyId}
      currentUserId={session.user.id}
      canInvite={can(company, "team_management.invite_member")}
      canRemove={can(company, "team_management.remove_member")}
      canManageRoles={can(company, "team_management.manage_roles")}
      adminCount={adminCount}
      roles={roles.map((r) => ({ id: r.id, name: r.name, type: r.type }))}
      members={members.map((m) => ({
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        roleId: m.roleId,
        roleName: m.role.name,
        roleType: m.role.type,
        joinedAt: m.joinedAt.toISOString(),
      }))}
      invitations={invitations.map((i) => ({
        id: i.id,
        email: i.email,
        roleId: i.roleId,
        roleName: i.role.name,
        status: i.status,
        invitedByName: i.invitedBy.name,
        expiresAt: i.expiresAt.toISOString(),
        createdAt: i.createdAt.toISOString(),
      }))}
    />
  );
}
