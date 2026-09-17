import { db } from "@/lib/db";
import { issueOtp, OtpCooldownError, OtpRateLimitError } from "@/lib/otp";
import { forgotPasswordSchema } from "@/lib/validators";
import { jsonError, jsonOk, zodMessage } from "@/lib/api";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);
  const { email } = parsed.data;

  const user = await db.user.findUnique({ where: { email } });
  // Don't reveal account existence — always respond the same shape.
  if (!user || user.status === "suspended") {
    return jsonOk({ ok: true });
  }

  try {
    const { devCode } = await issueOtp(email, "password_reset", user.id);
    return jsonOk({ ok: true, devCode });
  } catch (err) {
    if (err instanceof OtpCooldownError || err instanceof OtpRateLimitError) {
      // Still report ok to avoid leaking whether the account exists via timing/shape.
      return jsonOk({ ok: true });
    }
    throw err;
  }
}
