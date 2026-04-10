import { AuditActionType, AuditEntityType } from "@prisma/client";
import { redirect } from "next/navigation";

import { createAuditLog } from "@/lib/audit";
import { createUserSession } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { redirectWithFeedback } from "@/lib/feedback";

export async function loginAction(formData: FormData) {
  "use server";

  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  if (!email || !password) {
    redirectWithFeedback("/login", "error", "Email et mot de passe sont requis.");
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    redirectWithFeedback("/login", "error", "Identifiants invalides.");
  }

  await createUserSession({
    userId: user.id,
    role: user.role,
    email: user.email,
    name: user.name
  });

  await createAuditLog({
    actorId: user.id,
    actionType: AuditActionType.LOGIN,
    entityType: AuditEntityType.AUTH_SESSION,
    entityId: user.id,
    metadataJson: {
      email: user.email,
      role: user.role
    }
  });

  redirect("/dashboard");
}
