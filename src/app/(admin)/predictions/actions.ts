"use server";

import { ApprovalStatus, AuditActionType, AuditEntityType, ConfidenceLabel } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { APPROVAL_STATUS_OPTIONS, CONFIDENCE_LABEL_OPTIONS } from "@/domain/options";
import { createAuditLog } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { redirectWithFeedback } from "@/lib/feedback";
import { getPrisma } from "@/lib/prisma";
import { assertRequiredString, parseEnumValue, ValidationError } from "@/lib/validation";

const PATH = "/predictions";

export async function savePredictionAction(formData: FormData) {
  const user = await requireAdmin();
  const prisma = getPrisma();
  const id = formData.get("id")?.toString() || undefined;

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
    const message = error instanceof ValidationError ? error.message : "Impossible d'enregistrer le pronostic.";
    redirectWithFeedback(PATH, "error", message, id ? { edit: id } : undefined);
  }
}

export async function deletePredictionAction(formData: FormData) {
  const user = await requireAdmin();
  const prisma = getPrisma();
  const id = assertRequiredString(formData.get("id"), "L'identifiant pronostic");

  await prisma.prediction.delete({ where: { id } });

  await createAuditLog({
    actorId: user.id,
    actionType: AuditActionType.DELETE,
    entityType: AuditEntityType.PREDICTION,
    entityId: id
  });

  revalidatePath(PATH);
  redirectWithFeedback(PATH, "success", "Pronostic supprime.");
}
