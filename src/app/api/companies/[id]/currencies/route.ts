import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireCompanyContext, can, CompanySuspendedError, NotMemberError } from "@/lib/rbac";
import { jsonError, jsonOk, zodMessage } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { createCurrencySchema } from "@/lib/validators";

export async function GET(_req: Request, ctx: RouteContext<"/api/companies/[id]/currencies">) {
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
  if (!can(company, "currency.view")) return jsonError("Tidak memiliki izin.", 403);

  const currencies = await db.currency.findMany({
    where: { companyId },
    orderBy: [{ isBase: "desc" }, { code: "asc" }],
    include: { rates: { orderBy: { effectiveDate: "desc" }, take: 1 } },
  });

  return jsonOk({
    currencies: currencies.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      symbol: c.symbol,
      isBase: c.isBase,
      status: c.status,
      latestRate: c.rates[0]?.rate ?? null,
      latestRateDate: c.rates[0]?.effectiveDate.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
    })),
    canCreate: can(company, "currency.create"),
  });
}

export async function POST(request: Request, ctx: RouteContext<"/api/companies/[id]/currencies">) {
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
  if (!can(company, "currency.create")) return jsonError("Tidak memiliki izin.", 403);

  const body = await request.json().catch(() => null);
  const parsed = createCurrencySchema.safeParse(body);
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);

  let currency;
  try {
    currency = await db.$transaction(async (tx) => {
      if (parsed.data.isBase) {
        await tx.currency.updateMany({ where: { companyId, isBase: true }, data: { isBase: false } });
      }
      return tx.currency.create({
        data: {
          companyId,
          code: parsed.data.code,
          name: parsed.data.name,
          symbol: parsed.data.symbol || null,
          isBase: parsed.data.isBase ?? false,
          createdById: session.user.id,
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
    action: "currency.created",
    targetType: "Currency",
    targetId: currency.id,
  });

  return jsonOk({ id: currency.id, code: currency.code });
}
