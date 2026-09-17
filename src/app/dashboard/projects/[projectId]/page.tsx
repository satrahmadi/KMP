import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { requireCompanyContext, can } from "@/lib/rbac";
import { ProjectDetailView } from "./project-detail-view";

export default async function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.companyId) redirect("/dashboard");

  const company = await requireCompanyContext(session.user.id, session.companyId);
  if (!can(company, "project.view")) redirect("/dashboard");

  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project || project.companyId !== session.companyId) notFound();

  return (
    <ProjectDetailView
      companyId={session.companyId}
      project={{
        id: project.id,
        code: project.code,
        name: project.name,
        description: project.description,
        costCenter: project.costCenter,
        classification: project.classification,
        status: project.status,
      }}
      canEdit={can(company, "project.edit")}
      canArchive={can(company, "project.archive")}
      canDelete={can(company, "project.delete")}
      showFinanceTab={can(company, "project_finance.view")}
    />
  );
}
