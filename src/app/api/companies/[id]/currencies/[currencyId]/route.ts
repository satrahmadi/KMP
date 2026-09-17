import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireCompanyContext, can, CompanySuspendedError, NotMemberError } from "@/lib/rbac";
import { jsonError, jsonOk, zodMessage } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { updateCurrencySchema } from "@/lib/validators";

async function loadCurrencyInCompany(companyId: string, currencyId: string) {
  const currency = await db.currency.findUnique({ where: { id: currencyId } });
  if (!currency || currency.companyId !== companyId) return null;
  return currency;
}

export async function GET(_req: Request, ctx: RouteContext<"/api/companies/[id]/currencies/[currencyId]">) {
  const { id: companyId, currencyId } = await ctx.params;
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
  if (!can(company, "currency.view")) return jsonError("Tidak memiliki izin.", 403);

  const currency = await loadCurrencyInCompany(companyId, currencyId);
  if (!currency) return jsonError("Currency tidak ditemukan.", 404);

  const rates = await db.exchangeRate.findMany({ where: { currencyId }, orderBy: { effectiveDate: "desc" } });

  return jsonOk({
    id: currency.id,
    code: currency.code,
    name: currency.name,
    symbol: currency.symbol,
    isBase: currency.isBase,
    status: currency.status,
    createdAt: currency.createdAt.toISOString(),
    canEdit: can(company, "currency.edit"),
    canDelete: can(company, "currency.delete"),
    rates: rates.map((r) => ({
      id: r.id,
      rate: r.rate,
      effectiveDate: r.effectiveDate.toISOString(),
    })),
  });
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/companies/[id]/currencies/[currencyId]">) {
  const { id: companyId, currencyId } = await ctx.params;
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
  if (!can(company, "currency.edit")) return jsonError("Tidak memiliki izin.", 403);

  const currency = await loadCurrencyInCompany(companyId, currencyId);
  if (!currency) return jsonError("Currency tidak ditemukan.", 404);

  const body = await request.json().catch(() => null);
  const parsed = updateCurrencySchema.safeParse(body);
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);

  try {
    await db.$transaction(async (tx) => {
      if (parsed.data.isBase) {
        await tx.currency.updateMany({ where: { companyId, isBase: true }, data: { isBase: false } });
      }
      await tx.currency.update({
        where: { id: currencyId },
        data: {
          ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
          ...(parsed.data.symbol !== undefined ? { symbol: parsed.data.symbol || null } : {}),
          ...(parsed.data.isBase !== undefined ? { isBase: parsed.data.isBase } : {}),
          ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
        },
      });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return jsonError("Currency dengan kode ini sudah ada di company.", 409);
    }
    throw err;
  }

  await logAudit({
    companyId,
    actorId: session.user.id,
    action: "currency.updated",
    targetType: "Currency",
    targetId: currencyId,
  });

  return jsonOk({ ok: true });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/companies/[id]/currencies/[currencyId]">) {
  const { id: companyId, currencyId } = await ctx.params;
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
  if (!can(company, "currency.delete")) return jsonError("Tidak memiliki izin.", 403);

  const currency = await loadCurrencyInCompany(companyId, currencyId);
  if (!currency) return jsonError("Currency tidak ditemukan.", 404);
  if (currency.status !== "archived") {
    return jsonError("Arsipkan currency ini terlebih dahulu sebelum menghapus permanen.", 409);
  }

  await db.$transaction([
    db.exchangeRate.deleteMany({ where: { currencyId } }),
    db.currency.delete({ where: { id: currencyId } }),
  ]);

  await logAudit({
    companyId,
    actorId: session.user.id,
    action: "currency.deleted",
    targetType: "Currency",
    targetId: currencyId,
  });

  return jsonOk({ ok: true });
}
