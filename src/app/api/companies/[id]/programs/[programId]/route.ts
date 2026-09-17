import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireCompanyContext, can, CompanySuspendedError, NotMemberError } from "@/lib/rbac";
import { jsonError, jsonOk, zodMessage } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { updateProgramSchema } from "@/lib/validators";

async function loadProgramInCompany(companyId: string, programId: string) {
  const program = await db.program.findUnique({ where: { id: programId } });
  if (!program || program.companyId !== companyId) return null;
  return program;
}

export async function GET(_req: Request, ctx: RouteContext<"/api/companies/[id]/programs/[programId]">) {
  const { id: companyId, programId } = await ctx.params;
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
  if (!can(company, "program.view")) return jsonError("Tidak memiliki izin.", 403);

  const program = await loadProgramInCompany(companyId, programId);
  if (!program) return jsonError("Program tidak ditemukan.", 404);

  return jsonOk({
    id: program.id,
    code: program.code,
    name: program.name,
    category: program.category,
    type: program.type,
    description: program.description,
    status: program.status,
    createdAt: program.createdAt.toISOString(),
    canEdit: can(company, "program.edit"),
    canDelete: can(company, "program.delete"),
  });
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/companies/[id]/programs/[programId]">) {
  const { id: companyId, programId } = await ctx.params;
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
  if (!can(company, "program.edit")) return jsonError("Tidak memiliki izin.", 403);

  const program = await loadProgramInCompany(companyId, programId);
  if (!program) return jsonError("Program tidak ditemukan.", 404);

  const body = await request.json().catch(() => null);
  const parsed = updateProgramSchema.safeParse(body);
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);

  await db.program.update({
    where: { id: programId },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.type !== undefined ? { type: parsed.data.type || null } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description || null } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
    },
  });

  await logAudit({
    companyId,
    actorId: session.user.id,
    action: "program.updated",
    targetType: "Program",
    targetId: programId,
  });

  return jsonOk({ ok: true });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/companies/[id]/programs/[programId]">) {
  const { id: companyId, programId } = await ctx.params;
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
  if (!can(company, "program.delete")) return jsonError("Tidak memiliki izin.", 403);

  const program = await loadProgramInCompany(companyId, programId);
  if (!program) return jsonError("Program tidak ditemukan.", 404);
  if (program.status !== "archived") {
    return jsonError("Arsipkan program ini terlebih dahulu sebelum menghapus permanen.", 409);
  }

  await db.program.delete({ where: { id: programId } });

  await logAudit({
    companyId,
    actorId: session.user.id,
    action: "program.deleted",
    targetType: "Program",
    targetId: programId,
  });

  return jsonOk({ ok: true });
}
