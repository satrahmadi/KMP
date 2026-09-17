import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, setActiveCompany } from "@/lib/session";
import { jsonError, jsonOk, zodMessage } from "@/lib/api";

const schema = z.object({ companyId: z.string().min(1) });

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return jsonError("Belum login.", 401);

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);

  const membership = await db.companyMember.findUnique({
    where: { companyId_userId: { companyId: parsed.data.companyId, userId: session.user.id } },
    include: { company: true },
  });
  if (!membership || membership.status !== "active") return jsonError("Bukan anggota company ini.", 403);
  if (membership.company.status === "suspended") {
    return jsonError("Company ini sedang dinonaktifkan.", 403, { code: "company_suspended" });
  }

  await setActiveCompany(membership.companyId);
  await db.user.update({ where: { id: session.user.id }, data: { lastActiveCompanyId: membership.companyId } });

  return jsonOk({ ok: true });
}
