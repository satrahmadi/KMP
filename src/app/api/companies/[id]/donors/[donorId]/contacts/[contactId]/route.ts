import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireCompanyContext, can, CompanySuspendedError, NotMemberError } from "@/lib/rbac";
import { jsonError, jsonOk, zodMessage } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { updateDonorContactSchema } from "@/lib/validators";

async function loadContactInDonor(companyId: string, donorId: string, contactId: string) {
  const donor = await db.donor.findUnique({ where: { id: donorId } });
  if (!donor || donor.companyId !== companyId) return null;
  const contact = await db.donorContact.findUnique({ where: { id: contactId } });
  if (!contact || contact.donorId !== donorId) return null;
  return contact;
}

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/companies/[id]/donors/[donorId]/contacts/[contactId]">
) {
  const { id: companyId, donorId, contactId } = await ctx.params;
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

  const contact = await loadContactInDonor(companyId, donorId, contactId);
  if (!contact) return jsonError("Kontak tidak ditemukan.", 404);

  const body = await request.json().catch(() => null);
  const parsed = updateDonorContactSchema.safeParse(body);
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);

  await db.donorContact.update({
    where: { id: contactId },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.email !== undefined ? { email: parsed.data.email || null } : {}),
      ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone || null } : {}),
      ...(parsed.data.position !== undefined ? { position: parsed.data.position || null } : {}),
    },
  });

  await logAudit({
    companyId,
    actorId: session.user.id,
    action: "donor.contact_updated",
    targetType: "DonorContact",
    targetId: contactId,
    metadata: { donorId },
  });

  return jsonOk({ ok: true });
}

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/companies/[id]/donors/[donorId]/contacts/[contactId]">
) {
  const { id: companyId, donorId, contactId } = await ctx.params;
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

  const contact = await loadContactInDonor(companyId, donorId, contactId);
  if (!contact) return jsonError("Kontak tidak ditemukan.", 404);

  await db.donorContact.delete({ where: { id: contactId } });

  await logAudit({
    companyId,
    actorId: session.user.id,
    action: "donor.contact_removed",
    targetType: "DonorContact",
    targetId: contactId,
    metadata: { donorId },
  });

  return jsonOk({ ok: true });
}
