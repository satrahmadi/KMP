import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { requireCompanyContext, can } from "@/lib/rbac";
import { DonorDetailView } from "./donor-detail-view";

export default async function DonorDetailPage({ params }: { params: Promise<{ donorId: string }> }) {
  const { donorId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.companyId) redirect("/dashboard");

  const company = await requireCompanyContext(session.user.id, session.companyId);
  if (!can(company, "donor.view")) redirect("/dashboard");

  const donor = await db.donor.findUnique({ where: { id: donorId } });
  if (!donor || donor.companyId !== session.companyId) notFound();

  const [contacts, agreements] = await Promise.all([
    db.donorContact.findMany({ where: { donorId }, orderBy: { createdAt: "desc" } }),
    db.donorAgreement.findMany({ where: { donorId }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <DonorDetailView
      companyId={session.companyId}
      donor={{
        id: donor.id,
        name: donor.name,
        category: donor.category,
        notes: donor.notes,
        status: donor.status,
      }}
      canEdit={can(company, "donor.edit")}
      canDelete={can(company, "donor.delete")}
      contacts={contacts.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        position: c.position,
      }))}
      agreements={agreements.map((a) => ({
        id: a.id,
        title: a.title,
        amount: a.amount,
        currency: a.currency,
        startDate: a.startDate ? a.startDate.toISOString() : null,
        endDate: a.endDate ? a.endDate.toISOString() : null,
        referenceUrl: a.referenceUrl,
        description: a.description,
        status: a.status,
      }))}
    />
  );
}
