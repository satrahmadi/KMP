import { db } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET(_req: Request, ctx: RouteContext<"/api/invitations/[token]">) {
  const { token } = await ctx.params;

  const invitation = await db.invitation.findUnique({
    where: { token },
    include: { company: true, role: true },
  });
  if (!invitation) return jsonError("Undangan tidak ditemukan.", 404);

  let status = invitation.status;
  if (status === "pending" && invitation.expiresAt < new Date()) {
    status = "expired";
    await db.invitation.update({ where: { id: invitation.id }, data: { status: "expired" } });
  }

  const existingUser = await db.user.findUnique({ where: { email: invitation.email } });

  return jsonOk({
    status,
    companyName: invitation.company.name,
    roleName: invitation.role.name,
    email: invitation.email,
    hasAccount: !!existingUser && existingUser.status !== "unverified",
  });
}
