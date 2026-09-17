import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { requireCompanyContext, can } from "@/lib/rbac";
import { ProgramsView } from "./programs-view";

export default async function ProgramsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.companyId) redirect("/dashboard");

  const company = await requireCompanyContext(session.user.id, session.companyId);
  if (!can(company, "program.view")) redirect("/dashboard");

  const programs = await db.program.findMany({
    where: { companyId: session.companyId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <ProgramsView
      companyId={session.companyId}
      canCreate={can(company, "program.create")}
      canEdit={can(company, "program.edit")}
      canDelete={can(company, "program.delete")}
      programs={programs.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        category: p.category,
        type: p.type,
        description: p.description,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
      }))}
    />
  );
}
