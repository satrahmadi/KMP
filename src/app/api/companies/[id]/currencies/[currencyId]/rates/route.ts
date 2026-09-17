import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireCompanyContext, can, CompanySuspendedError, NotMemberError } from "@/lib/rbac";
import { jsonError, jsonOk, zodMessage } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { createExchangeRateSchema } from "@/lib/validators";

async function loadCurrencyInCompany(companyId: string, currencyId: string) {
  const currency = await db.currency.findUnique({ where: { id: currencyId } });
  if (!currency || currency.companyId !== companyId) return null;
  return currency;
}

export async function POST(request: Request, ctx: RouteContext<"/api/companies/[id]/currencies/[currencyId]/rates">) {
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
  if (currency.isBase) {
    return jsonError("Currency ini adalah base currency, rate-nya selalu 1 dan tidak perlu diisi manual.", 409);
  }

  const body = await request.json().catch(() => null);
  const parsed = createExchangeRateSchema.safeParse(body);
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);

  const rate = await db.exchangeRate.create({
    data: {
      currencyId,
      rate: parsed.data.rate,
      effectiveDate: new Date(parsed.data.effectiveDate),
      createdById: session.user.id,
    },
  });

  await logAudit({
    companyId,
    actorId: session.user.id,
    action: "currency.rate_added",
    targetType: "ExchangeRate",
    targetId: rate.id,
    metadata: { currencyId },
  });

  return jsonOk({ id: rate.id });
}
