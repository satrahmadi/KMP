import { db } from "@/lib/db";
import { CompaniesView } from "./companies-view";

export default async function SuperadminCompaniesPage() {
  const companies = await db.company.findMany({
    include: { _count: { select: { members: { where: { status: "active" } } } }, createdBy: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <CompaniesView
      companies={companies.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        status: c.status,
        memberCount: c._count.members,
        createdByName: c.createdBy.name,
        createdAt: c.createdAt.toISOString(),
      }))}
    />
  );
}
