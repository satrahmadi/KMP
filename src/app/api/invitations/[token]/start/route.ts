import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { issueOtp, OtpCooldownError, OtpRateLimitError } from "@/lib/otp";
import { jsonError, jsonOk, zodMessage } from "@/lib/api";

const schema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .regex(/[a-zA-Z]/, "Password harus mengandung huruf")
    .regex(/[0-9]/, "Password harus mengandung angka"),
});

/** Kasus A (§6.7): invited email has no account yet — create it and send the registration OTP. */
export async function POST(request: Request, ctx: RouteContext<"/api/invitations/[token]/start">) {
  const { token } = await ctx.params;
  const invitation = await db.invitation.findUnique({ where: { token } });
  if (!invitation) return jsonError("Undangan tidak ditemukan.", 404);
  if (invitation.status !== "pending" || invitation.expiresAt < new Date()) {
    return jsonError("Undangan ini sudah tidak berlaku.", 409);
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);

  const existing = await db.user.findUnique({ where: { email: invitation.email } });
  if (existing && existing.status !== "unverified") {
    return jsonError("Email ini sudah punya akun. Silakan login.", 409, { code: "has_account" });
  }

  let userId: string;
  if (existing) {
    userId = existing.id;
    await db.user.update({
      where: { id: existing.id },
      data: { name: parsed.data.name, passwordHash: await hashPassword(parsed.data.password) },
    });
  } else {
    const user = await db.user.create({
      data: {
        name: parsed.data.name,
        email: invitation.email,
        passwordHash: await hashPassword(parsed.data.password),
        status: "unverified",
      },
    });
    userId = user.id;
  }

  try {
    const { devCode } = await issueOtp(invitation.email, "registration", userId);
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
