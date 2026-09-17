import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET() {
  const session = await getSession();
  if (!session) return jsonError("Belum login.", 401);

  const memberships = await db.companyMember.findMany({
    where: { userId: session.user.id, status: "active" },
    include: { company: true, role: true },
    orderBy: { joinedAt: "asc" },
  });

  return jsonOk({
    user: session.user,
    activeCompanyId: session.companyId,
    memberships: memberships.map((m) => ({
      companyId: m.companyId,
      companyName: m.company.name,
      companyStatus: m.company.status,
      roleId: m.roleId,
      roleName: m.role.name,
    })),
  });
}
