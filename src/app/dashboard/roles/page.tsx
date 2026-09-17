import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { requireCompanyContext, can } from "@/lib/rbac";
import { PERMISSION_CATALOG, MODULE_LABELS } from "@/lib/permissions";
import { RolesView } from "./roles-view";

export default async function RolesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.companyId) redirect("/dashboard");

  const company = await requireCompanyContext(session.user.id, session.companyId);
  if (!can(company, "roles.view")) redirect("/dashboard");

  const roles = await db.role.findMany({
    where: { OR: [{ companyId: null }, { companyId: session.companyId }] },
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { members: { where: { status: "active" } } } },
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return (
    <RolesView
      companyId={session.companyId}
      canManage={can(company, "roles.manage")}
      catalog={PERMISSION_CATALOG.map((p) => ({ key: p.key, module: p.module, label: p.label, description: p.description }))}
      moduleLabels={MODULE_LABELS}
      roles={roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        type: r.type,
        memberCount: r._count.members,
        permissionKeys: r.permissions.map((p) => p.permission.key),
      }))}
    />
  );
}
