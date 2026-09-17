import { Prisma, ProgramCategory } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireCompanyContext, can, CompanySuspendedError, NotMemberError } from "@/lib/rbac";
import { jsonError, jsonOk, zodMessage } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { createProgramSchema } from "@/lib/validators";

const CATEGORY_PREFIX: Record<ProgramCategory, string> = {
  education: "EDU",
  health: "HEALTH",
  economic_development: "ECON",
  governance: "GOV",
  environment: "ENV",
  humanitarian: "HUM",
  other: "OTH",
};

/** Atomically increments the per-Company/Category/Year counter and derives PREFIX-YEAR-001-style code (mirrors Project.code). */
async function nextProgramCode(tx: Prisma.TransactionClient, companyId: string, category: ProgramCategory) {
  const year = new Date().getFullYear();
  const counter = await tx.programCodeSeq.upsert({
    where: { companyId_category_year: { companyId, category, year } },
    create: { companyId, category, year, seq: 1 },
    update: { seq: { increment: 1 } },
  });
  return `${CATEGORY_PREFIX[category]}-${year}-${String(counter.seq).padStart(3, "0")}`;
}

export async function GET(_req: Request, ctx: RouteContext<"/api/companies/[id]/programs">) {
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
  if (!can(company, "program.view")) return jsonError("Tidak memiliki izin.", 403);

  const programs = await db.program.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });

  return jsonOk({
    programs: programs.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      category: p.category,
      type: p.type,
      description: p.description,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
    })),
    canCreate: can(company, "program.create"),
    canEdit: can(company, "program.edit"),
    canDelete: can(company, "program.delete"),
  });
}

export async function POST(request: Request, ctx: RouteContext<"/api/companies/[id]/programs">) {
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
  if (!can(company, "program.create")) return jsonError("Tidak memiliki izin.", 403);

  const body = await request.json().catch(() => null);
  const parsed = createProgramSchema.safeParse(body);
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);

  const program = await db.$transaction(async (tx) => {
    const code = await nextProgramCode(tx, companyId, parsed.data.category);
    return tx.program.create({
      data: {
        companyId,
        code,
        name: parsed.data.name,
        category: parsed.data.category,
        type: parsed.data.type || null,
        description: parsed.data.description || null,
        createdById: session.user.id,
      },
    });
  });

  await logAudit({
    companyId,
    actorId: session.user.id,
    action: "program.created",
    targetType: "Program",
    targetId: program.id,
  });

  return jsonOk({ id: program.id, code: program.code });
}
