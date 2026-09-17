import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { acceptInvitationForUser } from "@/lib/invitations";
import { jsonError, jsonOk } from "@/lib/api";

/** Kasus B (§6.7): invited email already has an account — must be logged in as that email. */
export async function POST(_req: Request, ctx: RouteContext<"/api/invitations/[token]/accept">) {
  const { token } = await ctx.params;
  const session = await getSession();
  if (!session) return jsonError("Silakan login terlebih dahulu.", 401, { code: "login_required" });

  const invitation = await db.invitation.findUnique({ where: { token } });
  if (!invitation) return jsonError("Undangan tidak ditemukan.", 404);

  if (invitation.email !== session.user.email) {
    return jsonError("Undangan ini ditujukan untuk email lain.", 403, { code: "email_mismatch" });
  }

  const accepted = await acceptInvitationForUser(invitation.id, session.user.id);
  if (!accepted.ok) {
    const message =
      accepted.reason === "already_accepted" ? "Undangan sudah digunakan." : "Undangan ini sudah tidak berlaku.";
    return jsonError(message, 409, { reason: accepted.reason });
  }

  return jsonOk({ ok: true, companyId: accepted.companyId });
}
