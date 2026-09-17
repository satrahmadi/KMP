import { db } from "@/lib/db";

export async function logAudit(params: {
  companyId?: string | null;
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}) {
  await db.auditLog.create({
    data: {
      companyId: params.companyId ?? null,
      actorId: params.actorId ?? null,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    },
  });
}
