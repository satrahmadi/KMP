import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, destroyAllSessionsForUser } from "@/lib/session";
import { jsonError, jsonOk, zodMessage } from "@/lib/api";
import { logAudit } from "@/lib/audit";

const schema = z.object({ status: z.enum(["active", "suspended"]) });

export async function PATCH(request: Request, ctx: RouteContext<"/api/superadmin/users/[id]/status">) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return jsonError("Belum login.", 401);
  if (!session.user.isSuperadmin) return jsonError("Tidak memiliki izin.", 403);

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 422);

  if (id === session.user.id && parsed.data.status === "suspended") {
    return jsonError("Superadmin tidak dapat men-suspend akun sendiri.", 403);
  }

  const user = await db.user.findUnique({ where: { id } });
  if (!user) return jsonError("User tidak ditemukan.", 404);
  if (user.status === "unverified") return jsonError("User belum terverifikasi.", 409);

  await db.user.update({ where: { id }, data: { status: parsed.data.status } });

  if (parsed.data.status === "suspended") {
    await destroyAllSessionsForUser(id);
  }

  await logAudit({
    actorId: session.user.id,
    action: parsed.data.status === "suspended" ? "user.suspended" : "user.activated",
    targetType: "User",
    targetId: id,
  });

  return jsonOk({ ok: true });
}
