import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { requireCompanyContext, can } from "@/lib/rbac";
import { CurrencyDetailView } from "./currency-detail-view";

export default async function CurrencyDetailPage({ params }: { params: Promise<{ currencyId: string }> }) {
  const { currencyId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.companyId) redirect("/dashboard");

  const company = await requireCompanyContext(session.user.id, session.companyId);
  if (!can(company, "currency.view")) redirect("/dashboard");

  const currency = await db.currency.findUnique({ where: { id: currencyId } });
  if (!currency || currency.companyId !== session.companyId) notFound();

  const rates = await db.exchangeRate.findMany({ where: { currencyId }, orderBy: { effectiveDate: "desc" } });

  return (
    <CurrencyDetailView
      companyId={session.companyId}
      currency={{
        id: currency.id,
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol,
        isBase: currency.isBase,
        status: currency.status,
      }}
      canEdit={can(company, "currency.edit")}
      canDelete={can(company, "currency.delete")}
      rates={rates.map((r) => ({ id: r.id, rate: r.rate, effectiveDate: r.effectiveDate.toISOString() }))}
    />
  );
}
