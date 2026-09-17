import { z } from "zod";
import { db } from "@/lib/db";
import { verifyOtp } from "@/lib/otp";
import { createSession } from "@/lib/session";
import { acceptInvitationForUser } from "@/lib/invitations";
import { jsonError, jsonOk, zodMessage } from "@/lib/api";
import { isRateLimited } from "@/lib/rate-limit";

const schema = z.object({ code: z.string().length(6) });

const REASON_MESSAGES: Record<string, string> = {
  not_found: "Kode OTP tidak ditemukan. Minta kode baru.",
  expired: "Kode OTP sudah kedaluwarsa. Minta kode baru.",
  too_many_attempts: "Terlalu banyak percobaan salah. Minta kode baru.",
  wrong_code: "Kode OTP salah.",
};

/** Kasus A (§6.7), step 2: verify the registration OTP, then auto-join the inviting company. */
export async function POST(request: Request, ctx: RouteContext<"/api/invitations/[token]/verify">) {
  const { token } = await ctx.params;
  const invitation = await db.invitation.findUnique({ where: { token } });
  if (!invitation) return jsonError("Undangan tidak ditemukan.", 404);

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);

  if (isRateLimited(`invite-otp:${invitation.email}`, 15, 15 * 60 * 1000)) {
    return jsonError("Terlalu banyak percobaan. Coba lagi dalam beberapa menit.", 429);
  }

  const user = await db.user.findUnique({ where: { email: invitation.email } });
  if (!user) return jsonError("Akun tidak ditemukan.", 404);

  const result = await verifyOtp(invitation.email, "registration", parsed.data.code);
  if (!result.ok) return jsonError(REASON_MESSAGES[result.reason], 400, { reason: result.reason });

  await db.user.update({ where: { id: user.id }, data: { status: "active", emailVerifiedAt: new Date() } });
  await createSession(user.id);

  const accepted = await acceptInvitationForUser(invitation.id, user.id);
  if (!accepted.ok) return jsonError("Undangan sudah tidak berlaku.", 409);

  return jsonOk({ ok: true, companyId: accepted.companyId });
}
