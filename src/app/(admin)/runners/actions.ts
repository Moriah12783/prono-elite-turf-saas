"use server";

import { AuditActionType, AuditEntityType, Prisma, RunnerStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { RUNNER_STATUS_OPTIONS } from "@/domain/options";
import { getUserFacingActionErrorMessage, logServerActionError, rethrowIfRedirectError } from "@/lib/action-errors";
import { createAuditLog } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { redirectWithFeedback } from "@/lib/feedback";
import { getPrisma } from "@/lib/prisma";
import { syncRaceDerivedFields } from "@/lib/race-sync";
import { ensureRunnerDeletionAllowed } from "@/services/deletion-guard-service";
import {
  assertRequiredString,
  parseBoolean,
  parseEnumValue,
  parseInteger,
  parseOptionalFloat,
  parseOptionalString
} from "@/lib/validation";

const PATH = "/runners";

export async function saveRunnerAction(formData: FormData) {
  const user = await requireAdmin();
  const prisma = getPrisma();
  const id = formData.get("id")?.toString() || undefined;
  const actionName = id ? "save-runner:update" : "save-runner:create";

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

    const race = await prisma.race.findUnique({ where: { id: raceId }, select: { id: true } });
    if (!race) {
      throw new Error("La course selectionnee est introuvable.");
    }

    if (!id) {
      const existingRunner = await prisma.runner.findUnique({
        where: {
          raceId_number: {
            raceId,
            number
          }
        },
        select: { id: true }
      });

      if (existingRunner) {
        throw new Error("Ce numero existe deja pour cette course.");
      }
    }

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
        error.message === "Ce numero existe deja pour cette course.")
        ? error.message
        : "Impossible d'enregistrer le partant."
    );
    redirectWithFeedback(PATH, "error", message, id ? { edit: id } : undefined);
  }
}

export async function deleteRunnerAction(formData: FormData) {
  const user = await requireAdmin();
  const prisma = getPrisma();
  const id = assertRequiredString(formData.get("id"), "L'identifiant partant");

  try {
    const raceId = await ensureRunnerDeletionAllowed(id);
    await prisma.runner.delete({ where: { id } });
    await syncRaceDerivedFields(raceId);

    await createAuditLog({
      actorId: user.id,
      actionType: AuditActionType.DELETE,
      entityType: AuditEntityType.RUNNER,
      entityId: id,
      metadataJson: { raceId }
    });

    revalidatePath(PATH);
    redirectWithFeedback(PATH, "success", "Partant supprime.");
  } catch (error) {
    rethrowIfRedirectError(error);
    logServerActionError("delete-runner", error, {
      userId: user.id,
      id
    });
    const message = getUserFacingActionErrorMessage(error, "Impossible de supprimer le partant.");
    redirectWithFeedback(PATH, "error", message);
  }
}
