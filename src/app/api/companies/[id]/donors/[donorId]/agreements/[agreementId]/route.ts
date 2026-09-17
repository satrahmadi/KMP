import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireCompanyContext, can, CompanySuspendedError, NotMemberError } from "@/lib/rbac";
import { jsonError, jsonOk, zodMessage } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { updateDonorAgreementSchema } from "@/lib/validators";

async function loadAgreementInDonor(companyId: string, donorId: string, agreementId: string) {
  const donor = await db.donor.findUnique({ where: { id: donorId } });
  if (!donor || donor.companyId !== companyId) return null;
  const agreement = await db.donorAgreement.findUnique({ where: { id: agreementId } });
  if (!agreement || agreement.donorId !== donorId) return null;
  return agreement;
}

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/companies/[id]/donors/[donorId]/agreements/[agreementId]">
) {
  const { id: companyId, donorId, agreementId } = await ctx.params;
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
  if (!can(company, "donor.edit")) return jsonError("Tidak memiliki izin.", 403);

  const agreement = await loadAgreementInDonor(companyId, donorId, agreementId);
  if (!agreement) return jsonError("Agreement tidak ditemukan.", 404);

  const body = await request.json().catch(() => null);
  const parsed = updateDonorAgreementSchema.safeParse(body);
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);

  await db.donorAgreement.update({
    where: { id: agreementId },
    data: {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.amount !== undefined ? { amount: parsed.data.amount } : {}),
      ...(parsed.data.currency !== undefined ? { currency: parsed.data.currency || "IDR" } : {}),
      ...(parsed.data.startDate !== undefined
        ? { startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null }
        : {}),
      ...(parsed.data.endDate !== undefined
        ? { endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null }
        : {}),
      ...(parsed.data.referenceUrl !== undefined ? { referenceUrl: parsed.data.referenceUrl || null } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description || null } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
    },
  });

  await logAudit({
    companyId,
    actorId: session.user.id,
    action: "donor.agreement_updated",
    targetType: "DonorAgreement",
    targetId: agreementId,
    metadata: { donorId },
  });

  return jsonOk({ ok: true });
}

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/companies/[id]/donors/[donorId]/agreements/[agreementId]">
) {
  const { id: companyId, donorId, agreementId } = await ctx.params;
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
  if (!can(company, "donor.edit")) return jsonError("Tidak memiliki izin.", 403);

  const agreement = await loadAgreementInDonor(companyId, donorId, agreementId);
  if (!agreement) return jsonError("Agreement tidak ditemukan.", 404);

  await db.donorAgreement.delete({ where: { id: agreementId } });

  await logAudit({
    companyId,
    actorId: session.user.id,
    action: "donor.agreement_removed",
    targetType: "DonorAgreement",
    targetId: agreementId,
    metadata: { donorId },
  });

  return jsonOk({ ok: true });
}
