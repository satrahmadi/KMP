import { z } from "zod";
import { db } from "@/lib/db";
import { issueOtp, OtpCooldownError, OtpRateLimitError } from "@/lib/otp";
import { jsonError, jsonOk, zodMessage } from "@/lib/api";

const schema = z.object({
  email: z.string().trim().email().toLowerCase(),
  purpose: z.enum(["registration", "login_verification"]),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);
  const { email, purpose } = parsed.data;

  const user = await db.user.findUnique({ where: { email } });
  if (!user) return jsonError("Akun tidak ditemukan.", 404);
  if (user.status === "suspended") return jsonError("Akun dinonaktifkan, hubungi administrator.", 403);
  if (purpose === "login_verification" && user.status === "unverified") {
    return jsonError("Email belum diverifikasi.", 403, { code: "unverified" });
  }

  try {
    const { devCode } = await issueOtp(email, purpose, user.id);
    return jsonOk({ devCode });
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
