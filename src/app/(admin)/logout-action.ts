import { AuditActionType, AuditEntityType } from "@prisma/client";
import { redirect } from "next/navigation";

import { clearUserSession, getCurrentUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

export async function logoutAction() {
  "use server";

  const user = await getCurrentUser();

  if (user) {
    await createAuditLog({
      actorId: user.id,
      actionType: AuditActionType.LOGOUT,
      entityType: AuditEntityType.AUTH_SESSION,
      entityId: user.id,
      metadataJson: {
        email: user.email,
        role: user.role
      }
    });
  }

  await clearUserSession();
  redirect("/login");
}
