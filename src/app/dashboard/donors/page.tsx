import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { requireCompanyContext, can } from "@/lib/rbac";
import { DonorsView } from "./donors-view";

export default async function DonorsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.companyId) redirect("/dashboard");

  const company = await requireCompanyContext(session.user.id, session.companyId);
  if (!can(company, "donor.view")) redirect("/dashboard");

  const donors = await db.donor.findMany({
    where: { companyId: session.companyId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { contacts: true, agreements: true } } },
  });

  return (
    <DonorsView
      companyId={session.companyId}
      canCreate={can(company, "donor.create")}
      donors={donors.map((d) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        notes: d.notes,
        status: d.status,
        contactCount: d._count.contacts,
        agreementCount: d._count.agreements,
        createdAt: d.createdAt.toISOString(),
      }))}
    />
  );
}
