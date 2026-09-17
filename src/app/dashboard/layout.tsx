import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { requireCompanyContext } from "@/lib/rbac";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const memberships = await db.companyMember.findMany({
    where: { userId: session.user.id, status: "active" },
    include: { company: true, role: true },
    orderBy: { joinedAt: "asc" },
  });

  if (memberships.length === 0) {
    if (session.user.isSuperadmin) redirect("/superadmin");
    redirect("/onboarding/company");
  }

  let active = memberships.find((m) => m.companyId === session.companyId && m.company.status === "active");
  if (!active) active = memberships.find((m) => m.company.status === "active");
  if (!active) redirect("/company-suspended");

  const company = await requireCompanyContext(session.user.id, active.companyId);

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row">
      <Sidebar
        user={{ name: session.user.name, email: session.user.email, isSuperadmin: session.user.isSuperadmin }}
        activeCompanyId={active.companyId}
        memberships={memberships.map((m) => ({
          companyId: m.companyId,
          companyName: m.company.name,
          companyStatus: m.company.status,
          roleName: m.role.name,
        }))}
        permissions={Array.from(company.permissions)}
      />
      <main className="flex-1 bg-canvas">
        <div className="mx-auto max-w-5xl px-6 py-10 sm:px-10">{children}</div>
      </main>
    </div>
  );
}
