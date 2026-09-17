import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");

  const memberships = await db.companyMember.findMany({
    where: { userId: session.user.id, status: "active" },
    include: { company: true },
  });

  if (memberships.length === 0) {
    if (session.user.isSuperadmin) redirect("/superadmin");
    redirect("/onboarding/company");
  }

  const hasActiveCompany = memberships.some((m) => m.company.status === "active");
  if (!hasActiveCompany) redirect("/company-suspended");

  redirect("/dashboard");
}
