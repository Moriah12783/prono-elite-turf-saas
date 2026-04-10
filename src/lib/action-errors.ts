import { Prisma } from "@prisma/client";

import { ValidationError } from "@/lib/validation";

function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export function rethrowIfRedirectError(error: unknown) {
  if (isRedirectError(error)) {
    throw error;
  }
}

export function logServerActionError(actionName: string, error: unknown, context?: Record<string, unknown>) {
  console.error(`[server-action:${actionName}]`, {
    context,
    error
  });
}

export function getUserFacingActionErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof ValidationError) {
    return error.message;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta?.target.join(", ") : String(error.meta?.target ?? "");

      if (target.includes("external_source_id")) {
        return "Cet identifiant de source externe est deja utilise par une autre course.";
      }

      if (target.includes("race_id")) {
        return "Une fiche existe deja pour cette course. Modifiez l'element existant au lieu d'en creer un nouveau.";
      }

      return "Une valeur unique existe deja. Verifiez les doublons avant de recommencer.";
    }

    if (error.code === "P2003") {
      return "Une relation obligatoire est invalide ou introuvable.";
    }

    if (error.code === "P2025") {
      return "L'element cible est introuvable ou a deja ete supprime.";
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return "Les donnees envoyees ne correspondent pas au format attendu.";
  }

  if (error instanceof SyntaxError) {
    return "Le format des donnees est invalide.";
  }

  return fallbackMessage;
}
