import crypto from "node:crypto";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireCompanyContext, can, CompanySuspendedError, NotMemberError } from "@/lib/rbac";
import { jsonError, jsonOk } from "@/lib/api";
import { sendMail } from "@/lib/mailer";
import { logAudit } from "@/lib/audit";

const INVITATION_TTL_DAYS = 7;

export async function POST(
  _req: Request,
  ctx: RouteContext<"/api/companies/[id]/invitations/[invId]/resend">
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

  const invitation = await db.invitation.findUnique({ where: { id: invId }, include: { role: true } });
  if (!invitation || invitation.companyId !== companyId) return jsonError("Undangan tidak ditemukan.", 404);
  if (invitation.status === "accepted") return jsonError("Undangan sudah diterima.", 409);

  const token = crypto.randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.invitation.update({
    where: { id: invId },
    data: { token, expiresAt, status: "pending" },
  });

  await sendMail({
    to: invitation.email,
    subject: `Undangan bergabung ke ${company.companyName}`,
    text: `Anda diundang bergabung ke ${company.companyName} sebagai ${invitation.role.name}. Buka: /invite/${token}`,
  });

  await logAudit({
    companyId,
    actorId: session.user.id,
    action: "invitation.resent",
    targetType: "Invitation",
    targetId: invId,
  });

  return jsonOk({ ok: true });
}
