import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireCompanyContext, can, CompanySuspendedError, NotMemberError } from "@/lib/rbac";
import { jsonError, jsonOk, zodMessage } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { updateDonorSchema } from "@/lib/validators";

async function loadDonorInCompany(companyId: string, donorId: string) {
  const donor = await db.donor.findUnique({ where: { id: donorId } });
  if (!donor || donor.companyId !== companyId) return null;
  return donor;
}

export async function GET(_req: Request, ctx: RouteContext<"/api/companies/[id]/donors/[donorId]">) {
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
  if (!can(company, "donor.view")) return jsonError("Tidak memiliki izin.", 403);

  const donor = await loadDonorInCompany(companyId, donorId);
  if (!donor) return jsonError("Donor tidak ditemukan.", 404);

  const [contacts, agreements] = await Promise.all([
    db.donorContact.findMany({ where: { donorId }, orderBy: { createdAt: "desc" } }),
    db.donorAgreement.findMany({ where: { donorId }, orderBy: { createdAt: "desc" } }),
  ]);

  return jsonOk({
    id: donor.id,
    name: donor.name,
    category: donor.category,
    notes: donor.notes,
    status: donor.status,
    createdAt: donor.createdAt.toISOString(),
    canEdit: can(company, "donor.edit"),
    canDelete: can(company, "donor.delete"),
    contacts: contacts.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      position: c.position,
    })),
    agreements: agreements.map((a) => ({
      id: a.id,
      title: a.title,
      amount: a.amount,
      currency: a.currency,
      startDate: a.startDate ? a.startDate.toISOString() : null,
      endDate: a.endDate ? a.endDate.toISOString() : null,
      referenceUrl: a.referenceUrl,
      description: a.description,
      status: a.status,
    })),
  });
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/companies/[id]/donors/[donorId]">) {
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
  const parsed = updateDonorSchema.safeParse(body);
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);

  try {
    await db.donor.update({
      where: { id: donorId },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.category !== undefined ? { category: parsed.data.category } : {}),
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes || null } : {}),
        ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return jsonError("Donor dengan nama ini sudah ada di company.", 409);
    }
    throw err;
  }

  await logAudit({
    companyId,
    actorId: session.user.id,
    action: "donor.updated",
    targetType: "Donor",
    targetId: donorId,
  });

  return jsonOk({ ok: true });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/companies/[id]/donors/[donorId]">) {
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
  if (!can(company, "donor.delete")) return jsonError("Tidak memiliki izin.", 403);

  const donor = await loadDonorInCompany(companyId, donorId);
  if (!donor) return jsonError("Donor tidak ditemukan.", 404);
  if (donor.status !== "archived") {
    return jsonError("Arsipkan donor ini terlebih dahulu sebelum menghapus permanen.", 409);
  }

  await db.$transaction([
    db.donorAgreement.deleteMany({ where: { donorId } }),
    db.donorContact.deleteMany({ where: { donorId } }),
    db.donor.delete({ where: { id: donorId } }),
  ]);

  await logAudit({
    companyId,
    actorId: session.user.id,
    action: "donor.deleted",
    targetType: "Donor",
    targetId: donorId,
  });

  return jsonOk({ ok: true });
}
