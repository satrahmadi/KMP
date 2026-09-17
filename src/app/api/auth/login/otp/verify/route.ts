import { db } from "@/lib/db";
import { verifyOtp } from "@/lib/otp";
import { otpVerifySchema } from "@/lib/validators";
import { jsonError, jsonOk, zodMessage } from "@/lib/api";
import { createSession, setActiveCompany } from "@/lib/session";
import { isRateLimited } from "@/lib/rate-limit";

const REASON_MESSAGES: Record<string, string> = {
  not_found: "Kode OTP tidak ditemukan. Minta kode baru.",
  expired: "Kode OTP sudah kedaluwarsa. Minta kode baru.",
  too_many_attempts: "Terlalu banyak percobaan salah. Minta kode baru.",
  wrong_code: "Kode OTP salah.",
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = otpVerifySchema.safeParse(body);
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);
  const { email, code } = parsed.data;

  if (isRateLimited(`login-otp:${email}`, 15, 15 * 60 * 1000)) {
    return jsonError("Terlalu banyak percobaan. Coba lagi dalam beberapa menit.", 429);
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) return jsonError("Akun tidak ditemukan.", 404);
  if (user.status === "suspended") return jsonError("Akun dinonaktifkan, hubungi administrator.", 403);

  const result = await verifyOtp(email, "login_verification", code);
  if (!result.ok) return jsonError(REASON_MESSAGES[result.reason], 400, { reason: result.reason });

  await createSession(user.id);

  // Resolve which company should become active (§6.2 point 6).
  const memberships = await db.companyMember.findMany({
    where: { userId: user.id, status: "active" },
    include: { company: true },
    orderBy: { joinedAt: "asc" },
  });
  const lastActive = memberships.find((m) => m.companyId === user.lastActiveCompanyId);
  const active =
    (lastActive && lastActive.company.status === "active" ? lastActive : undefined) ??
    memberships.find((m) => m.company.status === "active") ??
    lastActive ??
    memberships[0];
  if (active) {
    await setActiveCompany(active.companyId);
  }

  return jsonOk({
    hasCompany: memberships.length > 0,
    companySuspended: active ? active.company.status === "suspended" : false,
  });
}
