import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireCompanyContext, can, CompanySuspendedError, NotMemberError } from "@/lib/rbac";
import { roleFormSchema } from "@/lib/validators";
import { jsonError, jsonOk, zodMessage } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export async function GET(_req: Request, ctx: RouteContext<"/api/companies/[id]/roles">) {
  const { id: companyId } = await ctx.params;
  const session = await getSession();
  if (!session) return jsonError("Belum login.", 401);

  let company;
  try {
    company = await requireCompanyContext(session.user.id, companyId);
  } catch (err) {
    if (err instanceof NotMemberError) return jsonError("Bukan anggota company ini.", 403);
    if (err instanceof CompanySuspendedError) return jsonError("Company ini sedang dinonaktifkan.", 403);
    throw err;
  }
  if (!can(company, "roles.view")) return jsonError("Tidak memiliki izin.", 403);

  const roles = await db.role.findMany({
    where: { OR: [{ companyId: null }, { companyId }] },
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { members: { where: { status: "active" } } } },
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return jsonOk({
    roles: roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      type: r.type,
      companyId: r.companyId,
      memberCount: r._count.members,
      permissionKeys: r.permissions.map((p) => p.permission.key),
    })),
    canManage: can(company, "roles.manage"),
  });
}

export async function POST(request: Request, ctx: RouteContext<"/api/companies/[id]/roles">) {
  const { id: companyId } = await ctx.params;
  const session = await getSession();
  if (!session) return jsonError("Belum login.", 401);

  let company;
  try {
    company = await requireCompanyContext(session.user.id, companyId);
  } catch (err) {
    if (err instanceof NotMemberError) return jsonError("Bukan anggota company ini.", 403);
    if (err instanceof CompanySuspendedError) return jsonError("Company ini sedang dinonaktifkan.", 403);
    throw err;
  }
  if (!can(company, "roles.manage")) return jsonError("Tidak memiliki izin.", 403);

  const body = await request.json().catch(() => null);
  const parsed = roleFormSchema.safeParse(body);
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);

  const nameTaken = await db.role.findFirst({
    where: { OR: [{ companyId: null }, { companyId }], name: { equals: parsed.data.name } },
  });
  if (nameTaken) return jsonError("Nama role sudah dipakai di company ini.", 409);

  const validPermissions = await db.permission.findMany({
    where: { key: { in: parsed.data.permissionKeys } },
  });

  const role = await db.role.create({
    data: {
      companyId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      type: "custom",
      createdById: session.user.id,
      permissions: {
        create: validPermissions.map((p) => ({ permissionId: p.id })),
      },
    },
  });

  await logAudit({
    companyId,
    actorId: session.user.id,
    action: "role.created",
    targetType: "Role",
    targetId: role.id,
    metadata: { name: role.name },
  });

  return jsonOk({ id: role.id });
}
