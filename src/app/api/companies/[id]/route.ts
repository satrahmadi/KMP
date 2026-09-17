import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireCompanyContext, can, CompanySuspendedError, NotMemberError } from "@/lib/rbac";
import { jsonError, jsonOk, zodMessage } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export async function GET(_req: Request, ctx: RouteContext<"/api/companies/[id]">) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return jsonError("Belum login.", 401);

  let company;
  try {
    company = await requireCompanyContext(session.user.id, id);
  } catch (err) {
    if (err instanceof NotMemberError) return jsonError("Bukan anggota company ini.", 403);
    if (err instanceof CompanySuspendedError) return jsonError("Company ini sedang dinonaktifkan.", 403);
    throw err;
  }
  if (!can(company, "company_settings.view")) return jsonError("Tidak memiliki izin.", 403);

  return jsonOk({
    id: company.companyId,
    name: company.companyName,
    status: company.companyStatus,
    canEdit: can(company, "company_settings.edit"),
  });
}

const patchSchema = z.object({ name: z.string().trim().min(2).max(120) });

export async function PATCH(request: Request, ctx: RouteContext<"/api/companies/[id]">) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return jsonError("Belum login.", 401);

  let company;
  try {
    company = await requireCompanyContext(session.user.id, id);
  } catch (err) {
    if (err instanceof NotMemberError) return jsonError("Bukan anggota company ini.", 403);
    if (err instanceof CompanySuspendedError) return jsonError("Company ini sedang dinonaktifkan.", 403);
    throw err;
  }
  if (!can(company, "company_settings.edit")) return jsonError("Tidak memiliki izin.", 403);

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);

  await db.company.update({ where: { id }, data: { name: parsed.data.name } });
  await logAudit({
    companyId: id,
    actorId: session.user.id,
    action: "company.updated",
    targetType: "Company",
    targetId: id,
  });

  return jsonOk({ ok: true });
}
