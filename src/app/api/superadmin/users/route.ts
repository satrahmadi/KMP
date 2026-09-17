import { z } from "zod";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { hashPassword } from "@/lib/password";
import { issueOtp } from "@/lib/otp";
import { jsonError, jsonOk, zodMessage } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await getSession();
  if (!session) return jsonError("Belum login.", 401);
  if (!session.user.isSuperadmin) return jsonError("Tidak memiliki izin.", 403);

  const users = await db.user.findMany({
    include: { memberships: { where: { status: "active" }, include: { company: true, role: true } } },
    orderBy: { createdAt: "desc" },
  });

  return jsonOk({
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      status: u.status,
      isSuperadmin: u.isSuperadmin,
      emailVerified: !!u.emailVerifiedAt,
      createdAt: u.createdAt,
      companies: u.memberships.map((m) => ({ companyId: m.companyId, companyName: m.company.name, roleName: m.role.name })),
    })),
  });
}

const createSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().toLowerCase(),
  companyId: z.string().optional(),
  roleId: z.string().optional(),
});

/** FR-11: Superadmin creates a user directly, outside public signup — email auto-verified, no OTP. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return jsonError("Belum login.", 401);
  if (!session.user.isSuperadmin) return jsonError("Tidak memiliki izin.", 403);

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return jsonError("Email sudah terdaftar.", 409);

  const tempPassword = crypto.randomBytes(12).toString("base64url");

  const user = await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hashPassword(tempPassword),
      status: "active",
      emailVerifiedAt: new Date(),
      createdById: session.user.id,
    },
  });

  if (parsed.data.companyId && parsed.data.roleId) {
    const role = await db.role.findUnique({ where: { id: parsed.data.roleId } });
    if (role && (role.companyId === null || role.companyId === parsed.data.companyId)) {
      await db.companyMember.create({
        data: { companyId: parsed.data.companyId, userId: user.id, roleId: role.id, invitedBy: session.user.id },
      });
    }
  }

  // No password was set by the user — send a "set your password" OTP (password_reset purpose).
  const { devCode } = await issueOtp(user.email, "password_reset", user.id);

  await logAudit({
    actorId: session.user.id,
    action: "user.created_by_superadmin",
    targetType: "User",
    targetId: user.id,
  });

  return jsonOk({ id: user.id, devCode });
}
