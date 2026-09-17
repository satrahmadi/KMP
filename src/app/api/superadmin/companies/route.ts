import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET() {
  const session = await getSession();
  if (!session) return jsonError("Belum login.", 401);
  if (!session.user.isSuperadmin) return jsonError("Tidak memiliki izin.", 403);

  const companies = await db.company.findMany({
    include: { _count: { select: { members: { where: { status: "active" } } } }, createdBy: true },
    orderBy: { createdAt: "desc" },
  });

  return jsonOk({
    companies: companies.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      status: c.status,
      memberCount: c._count.members,
      createdByName: c.createdBy.name,
      createdAt: c.createdAt,
      suspendedAt: c.suspendedAt,
    })),
  });
}
