"use server";

import { AuditActionType, AuditEntityType, ResultOfficialStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { RESULT_STATUS_OPTIONS } from "@/domain/options";
import { getUserFacingActionErrorMessage, logServerActionError, rethrowIfRedirectError } from "@/lib/action-errors";
import { createAuditLog } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { redirectWithFeedback } from "@/lib/feedback";
import { getPrisma } from "@/lib/prisma";
import { ensureResultDeletionAllowed } from "@/services/deletion-guard-service";
import { assertRequiredString, parseEnumValue, parseJsonArray } from "@/lib/validation";

const PATH = "/results";

export async function saveResultAction(formData: FormData) {
  const user = await requireAdmin();
  const prisma = getPrisma();
  const id = formData.get("id")?.toString() || undefined;
  const actionName = id ? "save-result:update" : "save-result:create";

  try {
    const raceId = assertRequiredString(formData.get("raceId"), "La course");
    const officialArrival = parseJsonArray(formData.get("officialArrival"), "L'arrivee officielle");
    const officialStatus = parseEnumValue(
      formData.get("officialStatus"),
      "Le statut resultat",
      RESULT_STATUS_OPTIONS
    ) as ResultOfficialStatus;

    const race = await prisma.race.findUnique({ where: { id: raceId }, select: { id: true } });
    if (!race) {
      throw new Error("La course selectionnee est introuvable.");
    }

    if (!id) {
      const existingResult = await prisma.result.findUnique({
        where: { raceId },
        select: { id: true }
      });

      if (existingResult) {
        throw new Error("Cette course possede deja un resultat. Ouvrez la fiche existante pour la modifier.");
      }
    }

    const result = id
      ? await prisma.result.update({
          where: { id },
          data: {
            raceId,
            officialArrival,
            officialStatus,
            importedAt: officialStatus === ResultOfficialStatus.OFFICIAL ? new Date() : null
          }
        })
      : await prisma.result.create({
          data: {
            raceId,
            officialArrival,
            officialStatus,
            importedAt: officialStatus === ResultOfficialStatus.OFFICIAL ? new Date() : null
          }
        });

    await createAuditLog({
      actorId: user.id,
      actionType: id ? AuditActionType.UPDATE : AuditActionType.CREATE,
      entityType: AuditEntityType.RESULT,
      entityId: result.id,
      metadataJson: {
        raceId,
        officialStatus,
        officialArrival
      }
    });

    revalidatePath(PATH);
    redirectWithFeedback(PATH, "success", id ? "Resultat mis a jour." : "Resultat cree.");
  } catch (error) {
    rethrowIfRedirectError(error);
    logServerActionError(actionName, error, {
      userId: user.id,
      id,
      formData: Object.fromEntries(formData.entries())
    });
    const message = getUserFacingActionErrorMessage(
      error,
      error instanceof Error &&
      (error.message === "La course selectionnee est introuvable." ||
        error.message === "Cette course possede deja un resultat. Ouvrez la fiche existante pour la modifier.")
        ? error.message
        : "Impossible d'enregistrer le resultat."
    );
    redirectWithFeedback(PATH, "error", message, id ? { edit: id } : undefined);
  }
}

export async function deleteResultAction(formData: FormData) {
  const user = await requireAdmin();
  const prisma = getPrisma();
  const id = assertRequiredString(formData.get("id"), "L'identifiant resultat");

  try {
    await ensureResultDeletionAllowed(id);
    await prisma.result.delete({ where: { id } });

    await createAuditLog({
      actorId: user.id,
      actionType: AuditActionType.DELETE,
      entityType: AuditEntityType.RESULT,
      entityId: id
    });

    revalidatePath(PATH);
    redirectWithFeedback(PATH, "success", "Resultat supprime.");
  } catch (error) {
    rethrowIfRedirectError(error);
    logServerActionError("delete-result", error, {
      userId: user.id,
      id
    });
    const message = getUserFacingActionErrorMessage(error, "Impossible de supprimer le resultat.");
    redirectWithFeedback(PATH, "error", message);
  }
}
