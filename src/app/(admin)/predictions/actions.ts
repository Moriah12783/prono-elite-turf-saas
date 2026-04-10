"use server";

import { ApprovalStatus, AuditActionType, AuditEntityType, ConfidenceLabel } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { APPROVAL_STATUS_OPTIONS, CONFIDENCE_LABEL_OPTIONS } from "@/domain/options";
import { getUserFacingActionErrorMessage, logServerActionError, rethrowIfRedirectError } from "@/lib/action-errors";
import { createAuditLog } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { redirectWithFeedback } from "@/lib/feedback";
import { getPrisma } from "@/lib/prisma";
import { ensurePredictionDeletionAllowed } from "@/services/deletion-guard-service";
import { assertRequiredString, parseEnumValue } from "@/lib/validation";

const PATH = "/predictions";

export async function savePredictionAction(formData: FormData) {
  const user = await requireAdmin();
  const prisma = getPrisma();
  const id = formData.get("id")?.toString() || undefined;
  const actionName = id ? "save-prediction:update" : "save-prediction:create";

  try {
    const raceId = assertRequiredString(formData.get("raceId"), "La course");
    const mainPick = assertRequiredString(formData.get("mainPick"), "La selection principale", 12);
    const basePick = assertRequiredString(formData.get("basePick"), "La base", 12);
    const outsiderPick = assertRequiredString(formData.get("outsiderPick"), "L'outsider", 12);
    const speculativePick = assertRequiredString(formData.get("speculativePick"), "Le profil speculatif", 12);
    const confidenceLabel = parseEnumValue(
      formData.get("confidenceLabel"),
      "L'indice de confiance",
      CONFIDENCE_LABEL_OPTIONS
    ) as ConfidenceLabel;
    const analysisText = assertRequiredString(formData.get("analysisText"), "L'analyse", 1200);
    const cautionText = assertRequiredString(formData.get("cautionText"), "La note de prudence", 600);
    const approvalStatus = parseEnumValue(
      formData.get("approvalStatus"),
      "Le statut d'approbation",
      APPROVAL_STATUS_OPTIONS
    ) as ApprovalStatus;

    const race = await prisma.race.findUnique({ where: { id: raceId }, select: { id: true } });
    if (!race) {
      throw new Error("La course selectionnee est introuvable.");
    }

    if (!id) {
      const existingPrediction = await prisma.prediction.findUnique({
        where: { raceId },
        select: { id: true }
      });

      if (existingPrediction) {
        throw new Error("Cette course possede deja un pronostic. Ouvrez la fiche existante pour la modifier.");
      }
    }

    const savedPrediction = id
      ? await prisma.prediction.update({
          where: { id },
          data: {
            raceId,
            mainPick,
            basePick,
            outsiderPick,
            speculativePick,
            confidenceLabel,
            analysisText,
            cautionText,
            approvalStatus,
            approvedById: approvalStatus === ApprovalStatus.APPROVED || approvalStatus === ApprovalStatus.PUBLISHED ? user.id : null
          }
        })
      : await prisma.prediction.create({
          data: {
            raceId,
            mainPick,
            basePick,
            outsiderPick,
            speculativePick,
            confidenceLabel,
            analysisText,
            cautionText,
            approvalStatus,
            approvedById: approvalStatus === ApprovalStatus.APPROVED || approvalStatus === ApprovalStatus.PUBLISHED ? user.id : null
          }
        });

    await createAuditLog({
      actorId: user.id,
      actionType: id ? AuditActionType.UPDATE : AuditActionType.CREATE,
      entityType: AuditEntityType.PREDICTION,
      entityId: savedPrediction.id,
      metadataJson: {
        raceId,
        approvalStatus,
        confidenceLabel
      }
    });

    revalidatePath(PATH);
    redirectWithFeedback(PATH, "success", id ? "Pronostic mis a jour." : "Pronostic cree.");
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
        error.message === "Cette course possede deja un pronostic. Ouvrez la fiche existante pour la modifier.")
        ? error.message
        : "Impossible d'enregistrer le pronostic."
    );
    redirectWithFeedback(PATH, "error", message, id ? { edit: id } : undefined);
  }
}

export async function deletePredictionAction(formData: FormData) {
  const user = await requireAdmin();
  const prisma = getPrisma();
  const id = assertRequiredString(formData.get("id"), "L'identifiant pronostic");

  try {
    await ensurePredictionDeletionAllowed(id);
    await prisma.prediction.delete({ where: { id } });

    await createAuditLog({
      actorId: user.id,
      actionType: AuditActionType.DELETE,
      entityType: AuditEntityType.PREDICTION,
      entityId: id
    });

    revalidatePath(PATH);
    redirectWithFeedback(PATH, "success", "Pronostic supprime.");
  } catch (error) {
    rethrowIfRedirectError(error);
    logServerActionError("delete-prediction", error, {
      userId: user.id,
      id
    });
    const message = getUserFacingActionErrorMessage(error, "Impossible de supprimer le pronostic.");
    redirectWithFeedback(PATH, "error", message);
  }
}
