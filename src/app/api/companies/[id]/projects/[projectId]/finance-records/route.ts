import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireCompanyContext, can, CompanySuspendedError, NotMemberError } from "@/lib/rbac";
import { jsonError, jsonOk, zodMessage } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { createFinanceRecordSchema } from "@/lib/validators";

async function loadProjectInCompany(companyId: string, projectId: string) {
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project || project.companyId !== companyId) return null;
  return project;
}

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/companies/[id]/projects/[projectId]/finance-records">
) {
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
  if (!can(company, "project_finance.view")) return jsonError("Tidak memiliki izin.", 403);

  const project = await loadProjectInCompany(companyId, projectId);
  if (!project) return jsonError("Project tidak ditemukan.", 404);

  const records = await db.financeRecord.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: { donor: { select: { id: true, name: true } } },
  });

  return jsonOk({
    records: records.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      donorId: r.donorId,
      donorName: r.donor?.name ?? null,
      amount: r.amount,
      currency: r.currency,
      recordDate: r.recordDate ? r.recordDate.toISOString() : null,
      periodStart: r.periodStart ? r.periodStart.toISOString() : null,
      periodEnd: r.periodEnd ? r.periodEnd.toISOString() : null,
      invoiceNumber: r.invoiceNumber,
      dueDate: r.dueDate ? r.dueDate.toISOString() : null,
      description: r.description,
      referenceUrl: r.referenceUrl,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    })),
    canCreate: can(company, "project_finance.create"),
    canEdit: can(company, "project_finance.edit"),
    canDelete: can(company, "project_finance.delete"),
  });
}

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/companies/[id]/projects/[projectId]/finance-records">
) {
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
  if (!can(company, "project_finance.create")) return jsonError("Tidak memiliki izin.", 403);

  const project = await loadProjectInCompany(companyId, projectId);
  if (!project) return jsonError("Project tidak ditemukan.", 404);
  if (project.status === "archived") {
    return jsonError("Project ini sudah diarsipkan, tidak menerima Finance Record baru.", 409);
  }

  const body = await request.json().catch(() => null);
  const parsed = createFinanceRecordSchema.safeParse(body);
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);

  if (parsed.data.donorId) {
    const donor = await db.donor.findUnique({ where: { id: parsed.data.donorId } });
    if (!donor || donor.companyId !== companyId) return jsonError("Donor tidak ditemukan di company ini.", 404);
  }

  const record = await db.financeRecord.create({
    data: {
      projectId,
      type: parsed.data.type,
      title: parsed.data.title,
      donorId: parsed.data.donorId || null,
      amount: parsed.data.amount ?? null,
      currency: parsed.data.currency || "IDR",
      recordDate: parsed.data.recordDate ? new Date(parsed.data.recordDate) : null,
      periodStart: parsed.data.periodStart ? new Date(parsed.data.periodStart) : null,
      periodEnd: parsed.data.periodEnd ? new Date(parsed.data.periodEnd) : null,
      invoiceNumber: parsed.data.invoiceNumber || null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      description: parsed.data.description || null,
      referenceUrl: parsed.data.referenceUrl || null,
      createdById: session.user.id,
    },
  });

  await logAudit({
    companyId,
    actorId: session.user.id,
    action: "project_finance.created",
    targetType: "FinanceRecord",
    targetId: record.id,
    metadata: { projectId },
  });

  return jsonOk({ id: record.id });
}
