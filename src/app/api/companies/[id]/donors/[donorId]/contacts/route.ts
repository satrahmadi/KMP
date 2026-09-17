import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireCompanyContext, can, CompanySuspendedError, NotMemberError } from "@/lib/rbac";
import { jsonError, jsonOk, zodMessage } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { createDonorContactSchema } from "@/lib/validators";

async function loadDonorInCompany(companyId: string, donorId: string) {
  const donor = await db.donor.findUnique({ where: { id: donorId } });
  if (!donor || donor.companyId !== companyId) return null;
  return donor;
}

export async function POST(request: Request, ctx: RouteContext<"/api/companies/[id]/donors/[donorId]/contacts">) {
  const { id: companyId, donorId } = await ctx.params;
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

  const donor = await loadDonorInCompany(companyId, donorId);
  if (!donor) return jsonError("Donor tidak ditemukan.", 404);

  const body = await request.json().catch(() => null);
  const parsed = createDonorContactSchema.safeParse(body);
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);

  const contact = await db.donorContact.create({
    data: {
      donorId,
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      position: parsed.data.position || null,
    },
  });

  await logAudit({
    companyId,
    actorId: session.user.id,
    action: "donor.contact_added",
    targetType: "DonorContact",
    targetId: contact.id,
    metadata: { donorId },
  });

  return jsonOk({ id: contact.id });
}
