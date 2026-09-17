import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { UsersView } from "./users-view";

export default async function SuperadminUsersPage() {
  const session = await getSession();

  const [users, companies, roles] = await Promise.all([
    db.user.findMany({
      include: { memberships: { where: { status: "active" }, include: { company: true, role: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.company.findMany({ where: { status: "active" }, orderBy: { name: "asc" } }),
    db.role.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] }),
  ]);

  return (
    <UsersView
      currentUserId={session!.user.id}
      users={users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        status: u.status,
        isSuperadmin: u.isSuperadmin,
        emailVerified: !!u.emailVerifiedAt,
        createdAt: u.createdAt.toISOString(),
        companies: u.memberships.map((m) => ({ companyName: m.company.name, roleName: m.role.name })),
      }))}
      companies={companies.map((c) => ({ id: c.id, name: c.name }))}
      roles={roles.map((r) => ({ id: r.id, name: r.name, companyId: r.companyId }))}
    />
  );
}
