import { db } from "@/lib/db";
import { verifyOtp } from "@/lib/otp";
import { otpVerifySchema } from "@/lib/validators";
import { jsonError, jsonOk, zodMessage } from "@/lib/api";
import { createSession } from "@/lib/session";
import { isRateLimited } from "@/lib/rate-limit";

const REASON_MESSAGES: Record<string, string> = {
  not_found: "Kode OTP tidak ditemukan. Minta kode baru.",
  expired: "Kode OTP sudah kedaluwarsa. Minta kode baru.",
  too_many_attempts: "Terlalu banyak percobaan salah. Minta kode baru.",
  wrong_code: "Kode OTP salah.",
};

/** Verifies the registration OTP, activates the account, and auto-logs the user in. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = otpVerifySchema.safeParse(body);
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);
  const { email, code } = parsed.data;

  if (isRateLimited(`register-otp:${email}`, 15, 15 * 60 * 1000)) {
    return jsonError("Terlalu banyak percobaan. Coba lagi dalam beberapa menit.", 429);
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) return jsonError("Akun tidak ditemukan.", 404);

  const result = await verifyOtp(email, "registration", code);
  if (!result.ok) return jsonError(REASON_MESSAGES[result.reason], 400, { reason: result.reason });

  await db.user.update({
    where: { id: user.id },
    data: { status: "active", emailVerifiedAt: new Date() },
  });

  await createSession(user.id);

  return jsonOk({ ok: true });
}
