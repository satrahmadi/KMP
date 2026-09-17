import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { requireCompanyContext, can } from "@/lib/rbac";
import { FinanceView } from "./finance-view";

export default async function ProjectFinancePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.companyId) redirect("/dashboard");

  const company = await requireCompanyContext(session.user.id, session.companyId);
  if (!can(company, "project.view")) redirect("/dashboard");
  if (!can(company, "project_finance.view")) redirect(`/dashboard/projects/${projectId}`);

  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project || project.companyId !== session.companyId) notFound();

  const [records, donors] = await Promise.all([
    db.financeRecord.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      include: { donor: { select: { id: true, name: true } } },
    }),
    db.donor.findMany({
      where: { companyId: session.companyId, status: "active" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <FinanceView
      companyId={session.companyId}
      project={{ id: project.id, code: project.code, name: project.name, status: project.status }}
      canCreate={can(company, "project_finance.create")}
      canEdit={can(company, "project_finance.edit")}
      canDelete={can(company, "project_finance.delete")}
      donors={donors}
      records={records.map((r) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        donorId: r.donorId,
        donorName: r.donor?.name ?? null,
        amount: r.amount,
        currency: r.currency,
        recordDate: r.recordDate ? r.recordDate.toISOString() : null,
        periodStart: r.periodStart ? r.periodStart.toISOString() : null,
        periodEnd: r.periodEnd ? r.periodEnd.toISOString() : null,
        invoiceNumber: r.invoiceNumber,
        dueDate: r.dueDate ? r.dueDate.toISOString() : null,
        description: r.description,
        referenceUrl: r.referenceUrl,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      }))}
    />
  );
}
