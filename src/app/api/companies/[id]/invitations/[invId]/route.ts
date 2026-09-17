import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireCompanyContext, can, CompanySuspendedError, NotMemberError } from "@/lib/rbac";
import { jsonError, jsonOk } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/companies/[id]/invitations/[invId]">
) {
  const { id: companyId, invId } = await ctx.params;
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
  if (!can(company, "team_management.invite_member")) return jsonError("Tidak memiliki izin.", 403);

  const invitation = await db.invitation.findUnique({ where: { id: invId } });
  if (!invitation || invitation.companyId !== companyId) return jsonError("Undangan tidak ditemukan.", 404);
  if (invitation.status !== "pending") return jsonError("Undangan ini sudah tidak pending.", 409);

  await db.invitation.update({ where: { id: invId }, data: { status: "revoked" } });
  await logAudit({
    companyId,
    actorId: session.user.id,
    action: "invitation.revoked",
    targetType: "Invitation",
    targetId: invId,
  });

  return jsonOk({ ok: true });
}
