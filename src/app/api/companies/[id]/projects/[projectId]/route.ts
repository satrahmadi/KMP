import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireCompanyContext, can, CompanySuspendedError, NotMemberError } from "@/lib/rbac";
import { jsonError, jsonOk, zodMessage } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { updateProjectSchema } from "@/lib/validators";

export async function GET(_req: Request, ctx: RouteContext<"/api/companies/[id]/projects/[projectId]">) {
  const { id: companyId, projectId } = await ctx.params;
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
  if (!can(company, "project.view")) return jsonError("Tidak memiliki izin.", 403);

  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project || project.companyId !== companyId) return jsonError("Project tidak ditemukan.", 404);

  return jsonOk({
    id: project.id,
    code: project.code,
    name: project.name,
    slug: project.slug,
    description: project.description,
    costCenter: project.costCenter,
    classification: project.classification,
    status: project.status,
    createdAt: project.createdAt.toISOString(),
    canEdit: can(company, "project.edit"),
    canArchive: can(company, "project.archive"),
    canDelete: can(company, "project.delete"),
  });
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/companies/[id]/projects/[projectId]">) {
  const { id: companyId, projectId } = await ctx.params;
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

  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project || project.companyId !== companyId) return jsonError("Project tidak ditemukan.", 404);

  const body = await request.json().catch(() => null);
  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);

  const changingStatus = parsed.data.status !== undefined && parsed.data.status !== project.status;
  const changingFields =
    parsed.data.name !== undefined ||
    parsed.data.description !== undefined ||
    parsed.data.costCenter !== undefined ||
    parsed.data.classification !== undefined;

  if (changingFields && !can(company, "project.edit")) return jsonError("Tidak memiliki izin.", 403);
  if (changingStatus && !can(company, "project.archive")) return jsonError("Tidak memiliki izin.", 403);

  const project2 = await db.project.update({
    where: { id: projectId },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description || null } : {}),
      ...(parsed.data.costCenter !== undefined ? { costCenter: parsed.data.costCenter || null } : {}),
      ...(parsed.data.classification !== undefined ? { classification: parsed.data.classification || null } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
    },
  });

  await logAudit({
    companyId,
    actorId: session.user.id,
    action: changingStatus ? `project.${project2.status}` : "project.updated",
    targetType: "Project",
    targetId: project.id,
  });

  return jsonOk({ ok: true });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/companies/[id]/projects/[projectId]">) {
  const { id: companyId, projectId } = await ctx.params;
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
  if (!can(company, "project.delete")) return jsonError("Tidak memiliki izin.", 403);

  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project || project.companyId !== companyId) return jsonError("Project tidak ditemukan.", 404);
  if (project.status !== "archived") {
    return jsonError("Arsipkan project ini terlebih dahulu sebelum menghapus permanen.", 409);
  }

  await db.project.delete({ where: { id: projectId } });
  await logAudit({
    companyId,
    actorId: session.user.id,
    action: "project.deleted",
    targetType: "Project",
    targetId: projectId,
  });

  return jsonOk({ ok: true });
}
