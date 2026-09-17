import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { issueOtp, OtpCooldownError, OtpRateLimitError } from "@/lib/otp";
import { loginSchema } from "@/lib/validators";
import { jsonError, jsonOk, zodMessage } from "@/lib/api";
import { isRateLimited } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);

  const { email, password } = parsed.data;

  if (isRateLimited(`login:${email}`, 10, 15 * 60 * 1000)) {
    return jsonError("Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.", 429);
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return jsonError("Email atau password salah.", 401);
  }

  if (user.status === "suspended") {
    return jsonError("Akun dinonaktifkan, hubungi administrator.", 403, { code: "suspended" });
  }

  if (user.status === "unverified") {
    try {
      const { devCode } = await issueOtp(email, "registration", user.id);
      return jsonError("Email belum diverifikasi. Kode verifikasi baru telah dikirim.", 403, {
        code: "unverified",
        devCode,
      });
    } catch (err) {
      if (err instanceof OtpCooldownError || err instanceof OtpRateLimitError) {
        return jsonError("Email belum diverifikasi. Cek email untuk kode verifikasi terbaru.", 403, {
          code: "unverified",
        });
      }
      throw err;
    }
  }

  try {
    const { devCode } = await issueOtp(email, "login_verification", user.id);
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
