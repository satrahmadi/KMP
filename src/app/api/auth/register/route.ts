import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { issueOtp, OtpCooldownError, OtpRateLimitError } from "@/lib/otp";
import { registerSchema } from "@/lib/validators";
import { jsonError, jsonOk, zodMessage } from "@/lib/api";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);

  const { name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });

  if (existing && existing.status !== "unverified") {
    return jsonError("Email sudah digunakan, silakan login.", 409, { code: "email_taken" });
  }

  let userId: string;
  if (existing) {
    // Registered but never finished OTP verification — resend instead of duplicating.
    userId = existing.id;
    await db.user.update({
      where: { id: existing.id },
      data: { name, passwordHash: await hashPassword(password) },
    });
  } else {
    const user = await db.user.create({
      data: { name, email, passwordHash: await hashPassword(password), status: "unverified" },
    });
    userId = user.id;
  }

  try {
    const { devCode } = await issueOtp(email, "registration", userId);
    return jsonOk({ email, devCode });
  } catch (err) {
    if (err instanceof OtpCooldownError) {
      return jsonError(`Tunggu ${err.secondsLeft} detik sebelum meminta OTP baru.`, 429, {
        secondsLeft: err.secondsLeft,
      });
    }
    if (err instanceof OtpRateLimitError) {
      return jsonError("Terlalu banyak permintaan OTP. Coba lagi dalam satu jam.", 429);
    }
    throw err;
  }
}
