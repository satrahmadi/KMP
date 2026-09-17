import { db } from "@/lib/db";
import { verifyOtp } from "@/lib/otp";
import { hashPassword } from "@/lib/password";
import { resetPasswordSchema } from "@/lib/validators";
import { jsonError, jsonOk, zodMessage } from "@/lib/api";
import { destroyAllSessionsForUser } from "@/lib/session";

const REASON_MESSAGES: Record<string, string> = {
  not_found: "Kode OTP tidak ditemukan. Minta kode baru.",
  expired: "Kode OTP sudah kedaluwarsa. Minta kode baru.",
  too_many_attempts: "Terlalu banyak percobaan salah. Minta kode baru.",
  wrong_code: "Kode OTP salah.",
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);
  const { email, code, password } = parsed.data;

  const user = await db.user.findUnique({ where: { email } });
  if (!user) return jsonError("Kode OTP tidak valid.", 400);

  const result = await verifyOtp(email, "password_reset", code);
  if (!result.ok) return jsonError(REASON_MESSAGES[result.reason], 400, { reason: result.reason });

  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } });
  // FR-4: resetting a password ends every other active session.
  await destroyAllSessionsForUser(user.id);

  return jsonOk({ ok: true });
}
