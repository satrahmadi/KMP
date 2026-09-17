import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { requireCompanyContext, can } from "@/lib/rbac";
import { CurrenciesView } from "./currencies-view";

export default async function CurrenciesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.companyId) redirect("/dashboard");

  const company = await requireCompanyContext(session.user.id, session.companyId);
  if (!can(company, "currency.view")) redirect("/dashboard");

  const currencies = await db.currency.findMany({
    where: { companyId: session.companyId },
    orderBy: [{ isBase: "desc" }, { code: "asc" }],
    include: { rates: { orderBy: { effectiveDate: "desc" }, take: 1 } },
  });

  return (
    <CurrenciesView
      companyId={session.companyId}
      canCreate={can(company, "currency.create")}
      currencies={currencies.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        symbol: c.symbol,
        isBase: c.isBase,
        status: c.status,
        latestRate: c.rates[0]?.rate ?? null,
        latestRateDate: c.rates[0]?.effectiveDate.toISOString() ?? null,
      }))}
    />
  );
}
