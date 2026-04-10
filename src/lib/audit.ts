import { AuditActionType, AuditEntityType } from "@prisma/client";

import { getPrisma } from "@/lib/prisma";

export async function createAuditLog(input: {
  actorId?: string | null;
  actionType: AuditActionType;
  entityType: AuditEntityType;
  entityId: string;
  metadataJson?: unknown;
}): Promise<void> {
  const prisma = getPrisma();

  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      actionType: input.actionType,
      entityType: input.entityType,
      entityId: input.entityId,
      metadataJson: input.metadataJson === undefined ? undefined : JSON.parse(JSON.stringify(input.metadataJson))
    }
  });
}
