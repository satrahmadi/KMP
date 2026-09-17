import { db } from "@/lib/db";
import { getSession, setActiveCompany } from "@/lib/session";
import { createCompanySchema, slugify } from "@/lib/validators";
import { jsonError, jsonOk, zodMessage } from "@/lib/api";
import { logAudit } from "@/lib/audit";

async function uniqueSlug(name: string) {
  const base = slugify(name);
  let slug = base;
  let i = 1;
  while (await db.company.findUnique({ where: { slug } })) {
    i += 1;
    slug = `${base}-${i}`;
  }
  return slug;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return jsonError("Belum login.", 401);

  const body = await request.json().catch(() => null);
  const parsed = createCompanySchema.safeParse(body);
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);

  const adminRole = await db.role.findFirst({ where: { companyId: null, type: "system", name: "Admin" } });
  if (!adminRole) return jsonError("System role Admin belum tersedia. Jalankan seed.", 500);

  const slug = await uniqueSlug(parsed.data.name);

  const company = await db.company.create({
    data: {
      name: parsed.data.name,
      slug,
      createdById: session.user.id,
      members: {
        create: { userId: session.user.id, roleId: adminRole.id },
      },
    },
  });

  await db.user.update({ where: { id: session.user.id }, data: { lastActiveCompanyId: company.id } });
  await setActiveCompany(company.id);
  await logAudit({
    companyId: company.id,
    actorId: session.user.id,
    action: "company.created",
    targetType: "Company",
    targetId: company.id,
  });

  return jsonOk({ id: company.id, name: company.name, slug: company.slug });
}
