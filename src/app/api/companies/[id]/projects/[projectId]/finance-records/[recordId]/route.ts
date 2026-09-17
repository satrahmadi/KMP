import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireCompanyContext, can, CompanySuspendedError, NotMemberError } from "@/lib/rbac";
import { jsonError, jsonOk, zodMessage } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { updateFinanceRecordSchema } from "@/lib/validators";

async function loadProjectInCompany(companyId: string, projectId: string) {
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project || project.companyId !== companyId) return null;
  return project;
}

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/companies/[id]/projects/[projectId]/finance-records/[recordId]">
) {
  const { id: companyId, projectId, recordId } = await ctx.params;
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
  if (!can(company, "project_finance.view")) return jsonError("Tidak memiliki izin.", 403);

  const project = await loadProjectInCompany(companyId, projectId);
  if (!project) return jsonError("Project tidak ditemukan.", 404);

  const record = await db.financeRecord.findUnique({
    where: { id: recordId },
    include: { donor: { select: { id: true, name: true } } },
  });
  if (!record || record.projectId !== projectId) return jsonError("Finance Record tidak ditemukan.", 404);

  return jsonOk({
    id: record.id,
    type: record.type,
    title: record.title,
    donorId: record.donorId,
    donorName: record.donor?.name ?? null,
    amount: record.amount,
    currency: record.currency,
    recordDate: record.recordDate ? record.recordDate.toISOString() : null,
    periodStart: record.periodStart ? record.periodStart.toISOString() : null,
    periodEnd: record.periodEnd ? record.periodEnd.toISOString() : null,
    invoiceNumber: record.invoiceNumber,
    dueDate: record.dueDate ? record.dueDate.toISOString() : null,
    description: record.description,
    referenceUrl: record.referenceUrl,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    canEdit: can(company, "project_finance.edit"),
    canDelete: can(company, "project_finance.delete"),
  });
}

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/companies/[id]/projects/[projectId]/finance-records/[recordId]">
) {
  const { id: companyId, projectId, recordId } = await ctx.params;
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
  if (!can(company, "project_finance.edit")) return jsonError("Tidak memiliki izin.", 403);

  const project = await loadProjectInCompany(companyId, projectId);
  if (!project) return jsonError("Project tidak ditemukan.", 404);
  if (project.status === "archived") {
    return jsonError("Project ini sudah diarsipkan, Finance Record tidak bisa diubah.", 409);
  }

  const record = await db.financeRecord.findUnique({ where: { id: recordId } });
  if (!record || record.projectId !== projectId) return jsonError("Finance Record tidak ditemukan.", 404);

  const body = await request.json().catch(() => null);
  const parsed = updateFinanceRecordSchema.safeParse(body);
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);

  if (parsed.data.donorId) {
    const donor = await db.donor.findUnique({ where: { id: parsed.data.donorId } });
    if (!donor || donor.companyId !== companyId) return jsonError("Donor tidak ditemukan di company ini.", 404);
  }

  await db.financeRecord.update({
    where: { id: recordId },
    data: {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.donorId !== undefined ? { donorId: parsed.data.donorId || null } : {}),
      ...(parsed.data.amount !== undefined ? { amount: parsed.data.amount } : {}),
      ...(parsed.data.currency !== undefined ? { currency: parsed.data.currency || "IDR" } : {}),
      ...(parsed.data.recordDate !== undefined
        ? { recordDate: parsed.data.recordDate ? new Date(parsed.data.recordDate) : null }
        : {}),
      ...(parsed.data.periodStart !== undefined
        ? { periodStart: parsed.data.periodStart ? new Date(parsed.data.periodStart) : null }
        : {}),
      ...(parsed.data.periodEnd !== undefined
        ? { periodEnd: parsed.data.periodEnd ? new Date(parsed.data.periodEnd) : null }
        : {}),
      ...(parsed.data.invoiceNumber !== undefined ? { invoiceNumber: parsed.data.invoiceNumber || null } : {}),
      ...(parsed.data.dueDate !== undefined ? { dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description || null } : {}),
      ...(parsed.data.referenceUrl !== undefined ? { referenceUrl: parsed.data.referenceUrl || null } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
    },
  });

  await logAudit({
    companyId,
    actorId: session.user.id,
    action: "project_finance.updated",
    targetType: "FinanceRecord",
    targetId: recordId,
    metadata: { projectId },
  });

  return jsonOk({ ok: true });
}

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/companies/[id]/projects/[projectId]/finance-records/[recordId]">
) {
  const { id: companyId, projectId, recordId } = await ctx.params;
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
  if (!can(company, "project_finance.delete")) return jsonError("Tidak memiliki izin.", 403);

  const project = await loadProjectInCompany(companyId, projectId);
  if (!project) return jsonError("Project tidak ditemukan.", 404);
  if (project.status === "archived") {
    return jsonError("Project ini sudah diarsipkan, Finance Record tidak bisa dihapus.", 409);
  }

  const record = await db.financeRecord.findUnique({ where: { id: recordId } });
  if (!record || record.projectId !== projectId) return jsonError("Finance Record tidak ditemukan.", 404);

  await db.financeRecord.delete({ where: { id: recordId } });
  await logAudit({
    companyId,
    actorId: session.user.id,
    action: "project_finance.deleted",
    targetType: "FinanceRecord",
    targetId: recordId,
    metadata: { projectId },
  });

  return jsonOk({ ok: true });
}
