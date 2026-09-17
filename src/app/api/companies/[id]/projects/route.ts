import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireCompanyContext, can, CompanySuspendedError, NotMemberError } from "@/lib/rbac";
import { jsonError, jsonOk, zodMessage } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { createProjectSchema, slugify } from "@/lib/validators";

async function uniqueProjectSlug(tx: Prisma.TransactionClient, companyId: string, name: string) {
  const base = slugify(name, "project");
  let slug = base;
  let i = 1;
  while (await tx.project.findUnique({ where: { companyId_slug: { companyId, slug } } })) {
    i += 1;
    slug = `${base}-${i}`;
  }
  return slug;
}

/** Atomically increments Company.projectSeq and derives the next PRJ-0001-style code (PRD §13). */
async function nextProjectCode(tx: Prisma.TransactionClient, companyId: string) {
  const company = await tx.company.update({
    where: { id: companyId },
    data: { projectSeq: { increment: 1 } },
  });
  return `PRJ-${String(company.projectSeq).padStart(4, "0")}`;
}

export async function GET(_req: Request, ctx: RouteContext<"/api/companies/[id]/projects">) {
  const { id: companyId } = await ctx.params;
  const session = await getSession();
  if (!session) return jsonError("Belum login.", 401);

  let company;
  try {
    company = await requireCompanyContext(session.user.id, companyId);
  } catch (err) {
    if (err instanceof NotMemberError) return jsonError("Bukan anggota company ini.", 403);
    if (err instanceof CompanySuspendedError) return jsonError("Company ini sedang dinonaktifkan.", 403);
    throw err;
  }
  if (!can(company, "project.view")) return jsonError("Tidak memiliki izin.", 403);

  const projects = await db.project.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });

  return jsonOk({
    projects: projects.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      slug: p.slug,
      description: p.description,
      costCenter: p.costCenter,
      classification: p.classification,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request, ctx: RouteContext<"/api/companies/[id]/projects">) {
  const { id: companyId } = await ctx.params;
  const session = await getSession();
  if (!session) return jsonError("Belum login.", 401);

  let company;
  try {
    company = await requireCompanyContext(session.user.id, companyId);
  } catch (err) {
    if (err instanceof NotMemberError) return jsonError("Bukan anggota company ini.", 403);
    if (err instanceof CompanySuspendedError) return jsonError("Company ini sedang dinonaktifkan.", 403);
    throw err;
  }
  if (!can(company, "project.create")) return jsonError("Tidak memiliki izin.", 403);

  const body = await request.json().catch(() => null);
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);

  const project = await db.$transaction(async (tx) => {
    const slug = await uniqueProjectSlug(tx, companyId, parsed.data.name);
    const code = await nextProjectCode(tx, companyId);
    return tx.project.create({
      data: {
        companyId,
        code,
        name: parsed.data.name,
        slug,
        description: parsed.data.description || null,
        costCenter: parsed.data.costCenter || null,
        classification: parsed.data.classification || null,
        createdById: session.user.id,
      },
    });
  });

  await logAudit({
    companyId,
    actorId: session.user.id,
    action: "project.created",
    targetType: "Project",
    targetId: project.id,
  });

  return jsonOk({ id: project.id, code: project.code, name: project.name, slug: project.slug });
}
