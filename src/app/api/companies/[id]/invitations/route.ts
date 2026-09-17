import crypto from "node:crypto";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireCompanyContext, can, CompanySuspendedError, NotMemberError } from "@/lib/rbac";
import { inviteSchema } from "@/lib/validators";
import { jsonError, jsonOk, zodMessage } from "@/lib/api";
import { sendMail } from "@/lib/mailer";
import { logAudit } from "@/lib/audit";

const INVITATION_TTL_DAYS = 7;

export async function POST(request: Request, ctx: RouteContext<"/api/companies/[id]/invitations">) {
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
  if (!can(company, "team_management.invite_member")) return jsonError("Tidak memiliki izin.", 403);

  const body = await request.json().catch(() => null);
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);

  const memberRole = await db.role.findFirst({ where: { companyId: null, type: "system", name: "Member" } });

  const results: Array<{ email: string; ok: boolean; message?: string }> = [];

  for (const invite of parsed.data.invites) {
    const roleId = invite.roleId || memberRole?.id;
    if (!roleId) {
      results.push({ email: invite.email, ok: false, message: "Role default tidak ditemukan." });
      continue;
    }

    const role = await db.role.findUnique({ where: { id: roleId } });
    if (!role || (role.companyId !== null && role.companyId !== companyId)) {
      results.push({ email: invite.email, ok: false, message: "Role tidak valid untuk company ini." });
      continue;
    }

    const activeMember = await db.companyMember.findFirst({
      where: { companyId, status: "active", user: { email: invite.email } },
    });
    if (activeMember) {
      results.push({ email: invite.email, ok: false, message: "Sudah menjadi anggota aktif." });
      continue;
    }

    const existingPending = await db.invitation.findFirst({
      where: { companyId, email: invite.email, status: "pending" },
    });
    if (existingPending) {
      // Extend/replace the pending invitation rather than creating a duplicate.
      await db.invitation.update({ where: { id: existingPending.id }, data: { status: "revoked" } });
    }

    const token = crypto.randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

    await db.invitation.create({
      data: {
        companyId,
        email: invite.email,
        roleId,
        token,
        invitedById: session.user.id,
        expiresAt,
      },
    });

    await sendMail({
      to: invite.email,
      subject: `Undangan bergabung ke ${company.companyName}`,
      text: `Anda diundang bergabung ke ${company.companyName} sebagai ${role.name}. Buka: /invite/${token}`,
    });

    await logAudit({
      companyId,
      actorId: session.user.id,
      action: "invitation.created",
      targetType: "Invitation",
      targetId: token,
      metadata: { email: invite.email, roleId },
    });

    results.push({ email: invite.email, ok: true });
  }

  return jsonOk({ results });
}
