"use server";

import { AuditActionType, AuditEntityType, Prisma, RunnerStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { RUNNER_STATUS_OPTIONS } from "@/domain/options";
import { createAuditLog } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { redirectWithFeedback } from "@/lib/feedback";
import { getPrisma } from "@/lib/prisma";
import { syncRaceDerivedFields } from "@/lib/race-sync";
import { assertRequiredString, parseBoolean, parseEnumValue, parseInteger, parseOptionalFloat, parseOptionalString, ValidationError } from "@/lib/validation";

const PATH = "/runners";

export async function saveRunnerAction(formData: FormData) {
  const user = await requireAdmin();
  const prisma = getPrisma();
  const id = formData.get("id")?.toString() || undefined;

  try {
    const raceId = assertRequiredString(formData.get("raceId"), "La course");
    const number = parseInteger(formData.get("number"), "Le numero", { min: 1, max: 30 });
    const horseName = assertRequiredString(formData.get("horseName"), "Le nom du cheval", 120);
    const jockeyName = parseOptionalString(formData.get("jockeyName"), 120);
    const trainerName = parseOptionalString(formData.get("trainerName"), 120);
    const oddsValue = parseOptionalFloat(formData.get("odds"), "La cote", { min: 0 });
    const isNonRunner = parseBoolean(formData.get("isNonRunner"));
    const status = parseEnumValue(formData.get("status"), "Le statut partant", RUNNER_STATUS_OPTIONS) as RunnerStatus;
    const rawData = parseOptionalString(formData.get("rawDataJson"), 1000);

    const payload = {
      raceId,
      number,
      horseName,
      jockeyName,
      trainerName,
      odds: oddsValue === null ? null : new Prisma.Decimal(oddsValue.toFixed(2)),
      isNonRunner,
      status,
      rawDataJson: rawData ? JSON.parse(rawData) : null
    };

    const runner = id
      ? await prisma.runner.update({
          where: { id },
          data: payload
        })
      : await prisma.runner.create({
          data: payload
        });

    await syncRaceDerivedFields(runner.raceId);
    await createAuditLog({
      actorId: user.id,
      actionType: id ? AuditActionType.UPDATE : AuditActionType.CREATE,
      entityType: AuditEntityType.RUNNER,
      entityId: runner.id,
      metadataJson: {
        horseName,
        raceId,
        status
      }
    });

    revalidatePath(PATH);
    redirectWithFeedback(PATH, "success", id ? "Partant mis a jour." : "Partant cree.");
  } catch (error) {
    const message = error instanceof SyntaxError ? "Le JSON brut est invalide." : error instanceof ValidationError ? error.message : "Impossible d'enregistrer le partant.";
    redirectWithFeedback(PATH, "error", message, id ? { edit: id } : undefined);
  }
}

export async function deleteRunnerAction(formData: FormData) {
  const user = await requireAdmin();
  const prisma = getPrisma();
  const id = assertRequiredString(formData.get("id"), "L'identifiant partant");

  const runner = await prisma.runner.delete({ where: { id } });
  await syncRaceDerivedFields(runner.raceId);

  await createAuditLog({
    actorId: user.id,
    actionType: AuditActionType.DELETE,
    entityType: AuditEntityType.RUNNER,
    entityId: id,
    metadataJson: { raceId: runner.raceId }
  });

  revalidatePath(PATH);
  redirectWithFeedback(PATH, "success", "Partant supprime.");
}
