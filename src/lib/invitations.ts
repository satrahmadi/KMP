import { db } from "@/lib/db";
import { setActiveCompany } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export type AcceptResult = { ok: true; companyId: string } | { ok: false; reason: string };

/** Turns a pending Invitation into a CompanyMember for `userId`, then marks it accepted. */
export async function acceptInvitationForUser(invitationId: string, userId: string): Promise<AcceptResult> {
  const invitation = await db.invitation.findUnique({ where: { id: invitationId } });
  if (!invitation) return { ok: false, reason: "not_found" };
  if (invitation.status === "accepted") return { ok: false, reason: "already_accepted" };
  if (invitation.status !== "pending" || invitation.expiresAt < new Date()) {
    return { ok: false, reason: "expired_or_revoked" };
  }

  const existingMember = await db.companyMember.findUnique({
    where: { companyId_userId: { companyId: invitation.companyId, userId } },
  });

  if (existingMember) {
    if (existingMember.status !== "active") {
      await db.companyMember.update({ where: { id: existingMember.id }, data: { status: "active" } });
    }
  } else {
    await db.companyMember.create({
      data: {
        companyId: invitation.companyId,
        userId,
        roleId: invitation.roleId,
        invitedBy: invitation.invitedById,
      },
    });
  }

  await db.invitation.update({ where: { id: invitation.id }, data: { status: "accepted" } });
  await db.user.update({ where: { id: userId }, data: { lastActiveCompanyId: invitation.companyId } });
  await setActiveCompany(invitation.companyId);

  await logAudit({
    companyId: invitation.companyId,
    actorId: userId,
    action: "invitation.accepted",
    targetType: "Invitation",
    targetId: invitation.id,
  });

  return { ok: true, companyId: invitation.companyId };
}
