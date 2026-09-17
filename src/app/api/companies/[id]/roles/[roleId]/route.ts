import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireCompanyContext, can, CompanySuspendedError, NotMemberError } from "@/lib/rbac";
import { roleFormSchema } from "@/lib/validators";
import { jsonError, jsonOk, zodMessage } from "@/lib/api";
import { logAudit } from "@/lib/audit";

async function loadCompanyAndRole(companyId: string, roleId: string, userId: string) {
  const company = await requireCompanyContext(userId, companyId);
  const role = await db.role.findUnique({ where: { id: roleId } });
  if (!role || (role.companyId !== null && role.companyId !== companyId)) {
    return { company, role: null as null };
  }
  return { company, role };
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/companies/[id]/roles/[roleId]">) {
  const { id: companyId, roleId } = await ctx.params;
  const session = await getSession();
  if (!session) return jsonError("Belum login.", 401);

  let loaded;
  try {
    loaded = await loadCompanyAndRole(companyId, roleId, session.user.id);
  } catch (err) {
    if (err instanceof NotMemberError) return jsonError("Bukan anggota company ini.", 403);
    if (err instanceof CompanySuspendedError) return jsonError("Company ini sedang dinonaktifkan.", 403);
    throw err;
  }
  const { company, role } = loaded;
  if (!can(company, "roles.manage")) return jsonError("Tidak memiliki izin.", 403);
  if (!role) return jsonError("Role tidak ditemukan.", 404);
  if (role.type === "system") return jsonError("System Role tidak dapat diubah.", 403);

  const body = await request.json().catch(() => null);
  const parsed = roleFormSchema.safeParse(body);
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);

  const nameTaken = await db.role.findFirst({
    where: {
      id: { not: roleId },
      OR: [{ companyId: null }, { companyId }],
      name: { equals: parsed.data.name },
    },
  });
  if (nameTaken) return jsonError("Nama role sudah dipakai di company ini.", 409);

  const validPermissions = await db.permission.findMany({
    where: { key: { in: parsed.data.permissionKeys } },
  });

  await db.$transaction([
    db.rolePermission.deleteMany({ where: { roleId } }),
    db.role.update({
      where: { id: roleId },
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        permissions: { create: validPermissions.map((p) => ({ permissionId: p.id })) },
      },
    }),
  ]);

  await logAudit({
    companyId,
    actorId: session.user.id,
    action: "role.updated",
    targetType: "Role",
    targetId: roleId,
  });

  return jsonOk({ ok: true });
}

const deleteSchema = z.object({ replacementRoleId: z.string().min(1).optional() });

export async function DELETE(request: Request, ctx: RouteContext<"/api/companies/[id]/roles/[roleId]">) {
  const { id: companyId, roleId } = await ctx.params;
  const session = await getSession();
  if (!session) return jsonError("Belum login.", 401);

  let loaded;
  try {
    loaded = await loadCompanyAndRole(companyId, roleId, session.user.id);
  } catch (err) {
    if (err instanceof NotMemberError) return jsonError("Bukan anggota company ini.", 403);
    if (err instanceof CompanySuspendedError) return jsonError("Company ini sedang dinonaktifkan.", 403);
    throw err;
  }
  const { company, role } = loaded;
  if (!can(company, "roles.manage")) return jsonError("Tidak memiliki izin.", 403);
  if (!role) return jsonError("Role tidak ditemukan.", 404);
  if (role.type === "system") return jsonError("System Role tidak dapat dihapus.", 403);

  const body = await request.json().catch(() => ({}));
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);

  const holders = await db.companyMember.count({ where: { roleId, status: "active" } });
  if (holders > 0) {
    const replacementId = parsed.data.replacementRoleId;
    if (!replacementId) {
      return jsonError("Role masih dipegang anggota. Pilih role pengganti terlebih dulu.", 409, {
        code: "needs_replacement",
        holders,
      });
    }
    const replacement = await db.role.findUnique({ where: { id: replacementId } });
    if (!replacement || (replacement.companyId !== null && replacement.companyId !== companyId) || replacement.id === roleId) {
      return jsonError("Role pengganti tidak valid.", 422);
    }
    await db.companyMember.updateMany({ where: { roleId, status: "active" }, data: { roleId: replacementId } });
  }

  // §6.7: a pending invitation whose Role gets deleted before acceptance falls
  // back to Member — it stays pending rather than being revoked.
  const memberRole = await db.role.findFirst({ where: { companyId: null, type: "system", name: "Member" } });
  const affectedInvitations = await db.invitation.findMany({ where: { roleId, status: "pending" } });
  if (memberRole && affectedInvitations.length > 0) {
    await db.invitation.updateMany({ where: { roleId, status: "pending" }, data: { roleId: memberRole.id } });
    for (const inv of affectedInvitations) {
      await logAudit({
        companyId,
        actorId: session.user.id,
        action: "invitation.role_fallback_to_member",
        targetType: "Invitation",
        targetId: inv.id,
        metadata: { deletedRoleId: roleId },
      });
    }
  }
  await db.role.delete({ where: { id: roleId } });

  await logAudit({
    companyId,
    actorId: session.user.id,
    action: "role.deleted",
    targetType: "Role",
    targetId: roleId,
  });

  return jsonOk({ ok: true });
}
