"use server";

import { AuditActionType, AuditEntityType, ResultOfficialStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { RESULT_STATUS_OPTIONS } from "@/domain/options";
import { createAuditLog } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { redirectWithFeedback } from "@/lib/feedback";
import { getPrisma } from "@/lib/prisma";
import { assertRequiredString, parseEnumValue, parseJsonArray, ValidationError } from "@/lib/validation";

const PATH = "/results";

export async function saveResultAction(formData: FormData) {
  const user = await requireAdmin();
  const prisma = getPrisma();
  const id = formData.get("id")?.toString() || undefined;

  try {
    const raceId = assertRequiredString(formData.get("raceId"), "La course");
    const officialArrival = parseJsonArray(formData.get("officialArrival"), "L'arrivee officielle");
    const officialStatus = parseEnumValue(
      formData.get("officialStatus"),
      "Le statut resultat",
      RESULT_STATUS_OPTIONS
    ) as ResultOfficialStatus;

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
    const message = error instanceof ValidationError ? error.message : "Impossible d'enregistrer le resultat.";
    redirectWithFeedback(PATH, "error", message, id ? { edit: id } : undefined);
  }
}

export async function deleteResultAction(formData: FormData) {
  const user = await requireAdmin();
  const prisma = getPrisma();
  const id = assertRequiredString(formData.get("id"), "L'identifiant resultat");

  await prisma.result.delete({ where: { id } });

  await createAuditLog({
    actorId: user.id,
    actionType: AuditActionType.DELETE,
    entityType: AuditEntityType.RESULT,
    entityId: id
  });

  revalidatePath(PATH);
  redirectWithFeedback(PATH, "success", "Resultat supprime.");
}
