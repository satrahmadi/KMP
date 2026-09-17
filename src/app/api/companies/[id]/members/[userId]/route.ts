import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireCompanyContext, can, countActiveAdmins, CompanySuspendedError, NotMemberError } from "@/lib/rbac";
import { jsonError, jsonOk, zodMessage } from "@/lib/api";
import { logAudit } from "@/lib/audit";

const patchSchema = z.object({ roleId: z.string().min(1) });

export async function PATCH(request: Request, ctx: RouteContext<"/api/companies/[id]/members/[userId]">) {
  const { id: companyId, userId } = await ctx.params;
  const session = await getSession();
  if (!session) return jsonError("Belum login.", 401);

  let company;
  try {
    company = await requireCompanyContext(session.user.id, companyId);
  } catch (err) {
    if (err instanceof NotMemberError) return jsonError("Bukan anggota company ini.", 403);
    if (err instanceof CompanySuspendedError) return jsonError("Company ini sedang dinonaktifkan.", 403);
    throw err;
  }
  if (!can(company, "team_management.manage_roles")) return jsonError("Tidak memiliki izin.", 403);

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);

  const member = await db.companyMember.findUnique({
    where: { companyId_userId: { companyId, userId } },
    include: { role: true },
  });
  if (!member || member.status !== "active") return jsonError("Anggota tidak ditemukan.", 404);

  const newRole = await db.role.findUnique({ where: { id: parsed.data.roleId } });
  if (!newRole || (newRole.companyId !== null && newRole.companyId !== companyId)) {
    return jsonError("Role tidak valid untuk company ini.", 422);
  }

  const isDemotingLastAdmin =
    member.role.type === "system" &&
    member.role.name === "Admin" &&
    newRole.id !== member.roleId &&
    (await countActiveAdmins(companyId)) <= 1;
  if (isDemotingLastAdmin) {
    return jsonError("Company wajib memiliki minimal satu Admin aktif.", 409);
  }

  await db.companyMember.update({ where: { id: member.id }, data: { roleId: newRole.id } });
  await logAudit({
    companyId,
    actorId: session.user.id,
    action: "member.role_changed",
    targetType: "CompanyMember",
    targetId: member.id,
    metadata: { fromRoleId: member.roleId, toRoleId: newRole.id },
  });

  return jsonOk({ ok: true });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/companies/[id]/members/[userId]">) {
  const { id: companyId, userId } = await ctx.params;
  const session = await getSession();
  if (!session) return jsonError("Belum login.", 401);

  let company;
  try {
    company = await requireCompanyContext(session.user.id, companyId);
  } catch (err) {
    if (err instanceof NotMemberError) return jsonError("Bukan anggota company ini.", 403);
    if (err instanceof CompanySuspendedError) return jsonError("Company ini sedang dinonaktifkan.", 403);
    throw err;
  }
  if (!can(company, "team_management.remove_member")) return jsonError("Tidak memiliki izin.", 403);

  const member = await db.companyMember.findUnique({
    where: { companyId_userId: { companyId, userId } },
    include: { role: true },
  });
  if (!member || member.status !== "active") return jsonError("Anggota tidak ditemukan.", 404);

  const isLastAdmin =
    member.role.type === "system" && member.role.name === "Admin" && (await countActiveAdmins(companyId)) <= 1;
  if (isLastAdmin) {
    return jsonError("Company wajib memiliki minimal satu Admin aktif.", 409);
  }

  await db.companyMember.update({ where: { id: member.id }, data: { status: "removed" } });
  await logAudit({
    companyId,
    actorId: session.user.id,
    action: "member.removed",
    targetType: "CompanyMember",
    targetId: member.id,
  });

  return jsonOk({ ok: true });
}
