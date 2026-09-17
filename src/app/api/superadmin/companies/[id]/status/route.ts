import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, clearCompanyFromSessions } from "@/lib/session";
import { jsonError, jsonOk, zodMessage } from "@/lib/api";
import { logAudit } from "@/lib/audit";

const schema = z.object({ status: z.enum(["active", "suspended"]) });

export async function PATCH(request: Request, ctx: RouteContext<"/api/superadmin/companies/[id]/status">) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return jsonError("Belum login.", 401);
  if (!session.user.isSuperadmin) return jsonError("Tidak memiliki izin.", 403);

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);

  const company = await db.company.findUnique({ where: { id } });
  if (!company) return jsonError("Company tidak ditemukan.", 404);

  await db.company.update({
    where: { id },
    data:
      parsed.data.status === "suspended"
        ? { status: "suspended", suspendedAt: new Date(), suspendedById: session.user.id }
        : { status: "active", suspendedAt: null, suspendedById: null },
  });

  if (parsed.data.status === "suspended") {
    // §11: suspend must cut access immediately, not wait for token expiry — but login
    // itself survives so the next request can show "Company ini sedang dinonaktifkan"
    // (or fall back to another active company) instead of a bare logged-out state.
    await clearCompanyFromSessions(id);
  }

  await logAudit({
    companyId: id,
    actorId: session.user.id,
    action: parsed.data.status === "suspended" ? "company.suspended" : "company.activated",
    targetType: "Company",
    targetId: id,
  });

  return jsonOk({ ok: true });
}
