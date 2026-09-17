import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireCompanyContext, can, CompanySuspendedError, NotMemberError } from "@/lib/rbac";
import { jsonError, jsonOk, zodMessage } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { createDonorSchema } from "@/lib/validators";

export async function GET(_req: Request, ctx: RouteContext<"/api/companies/[id]/donors">) {
  const { id: companyId } = await ctx.params;
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

  const donors = await db.donor.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { contacts: true, agreements: true } } },
  });

  return jsonOk({
    donors: donors.map((d) => ({
      id: d.id,
      name: d.name,
      category: d.category,
      notes: d.notes,
      status: d.status,
      contactCount: d._count.contacts,
      agreementCount: d._count.agreements,
      createdAt: d.createdAt.toISOString(),
    })),
    canCreate: can(company, "donor.create"),
  });
}

export async function POST(request: Request, ctx: RouteContext<"/api/companies/[id]/donors">) {
  const { id: companyId } = await ctx.params;
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
  if (!can(company, "donor.create")) return jsonError("Tidak memiliki izin.", 403);

  const body = await request.json().catch(() => null);
  const parsed = createDonorSchema.safeParse(body);
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);

  let donor;
  try {
    donor = await db.donor.create({
      data: {
        companyId,
        name: parsed.data.name,
        category: parsed.data.category,
        notes: parsed.data.notes || null,
        createdById: session.user.id,
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
    action: "donor.created",
    targetType: "Donor",
    targetId: donor.id,
  });

  return jsonOk({ id: donor.id, name: donor.name });
}
