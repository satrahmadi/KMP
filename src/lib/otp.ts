import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mailer";
import type { OtpPurpose } from "@prisma/client";

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
export const OTP_MAX_REQUESTS_PER_HOUR = 5;

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export class OtpRateLimitError extends Error {}
export class OtpCooldownError extends Error {
  constructor(public secondsLeft: number) {
    super("cooldown");
  }
}

/** Issues a fresh OTP, invalidating any previous unconsumed OTP for the same email+purpose. */
export async function issueOtp(email: string, purpose: OtpPurpose, userId?: string) {
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const recentCount = await db.otp.count({
    where: { email, purpose, createdAt: { gte: hourAgo } },
  });
  if (recentCount >= OTP_MAX_REQUESTS_PER_HOUR) {
    throw new OtpRateLimitError();
  }

  const last = await db.otp.findFirst({
    where: { email, purpose },
    orderBy: { createdAt: "desc" },
  });
  if (last && !last.consumedAt) {
    const secondsSince = (now.getTime() - last.createdAt.getTime()) / 1000;
    if (secondsSince < OTP_RESEND_COOLDOWN_SECONDS) {
      throw new OtpCooldownError(Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - secondsSince));
    }
    // Superseded: mark old OTP consumed so it can never be used again.
    await db.otp.update({ where: { id: last.id }, data: { consumedAt: now } });
  }

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000);

  await db.otp.create({
    data: { email, userId, purpose, codeHash, expiresAt },
  });

  const subject =
    purpose === "registration"
      ? "Kode verifikasi pendaftaran"
      : purpose === "login_verification"
        ? "Kode verifikasi login"
        : "Kode reset password";

  await sendMail({
    to: email,
    subject,
    text: `Kode OTP Anda: ${code}. Berlaku ${OTP_TTL_MINUTES} menit.`,
  });

  return { devCode: process.env.NODE_ENV !== "production" ? code : undefined };
}

export type OtpVerifyResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "expired" | "too_many_attempts" | "wrong_code" };

export async function verifyOtp(email: string, purpose: OtpPurpose, code: string): Promise<OtpVerifyResult> {
  const otp = await db.otp.findFirst({
    where: { email, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return { ok: false, reason: "not_found" };
  if (otp.attemptCount >= OTP_MAX_ATTEMPTS) return { ok: false, reason: "too_many_attempts" };
  if (otp.expiresAt < new Date()) return { ok: false, reason: "expired" };

  const matches = await bcrypt.compare(code, otp.codeHash);
  if (!matches) {
    await db.otp.update({ where: { id: otp.id }, data: { attemptCount: { increment: 1 } } });
    return { ok: false, reason: "wrong_code" };
  }

  await db.otp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
  return { ok: true };
}
