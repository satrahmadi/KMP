import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { requireCompanyContext, can } from "@/lib/rbac";
import { ProjectsView } from "./projects-view";

export default async function ProjectsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.companyId) redirect("/dashboard");

  const company = await requireCompanyContext(session.user.id, session.companyId);
  if (!can(company, "project.view")) redirect("/dashboard");

  const projects = await db.project.findMany({
    where: { companyId: session.companyId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <ProjectsView
      companyId={session.companyId}
      canCreate={can(company, "project.create")}
      projects={projects.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        description: p.description,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
      }))}
    />
  );
}
