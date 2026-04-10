"use server";

import { AuditActionType, AuditEntityType, PublicationMode, PublicationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { PUBLICATION_MODE_OPTIONS } from "@/domain/options";
import { getUserFacingActionErrorMessage, logServerActionError, rethrowIfRedirectError } from "@/lib/action-errors";
import { createAuditLog } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { redirectWithFeedback } from "@/lib/feedback";
import { getPrisma } from "@/lib/prisma";
import { syncRacePublicationStatus } from "@/lib/publication-sync";
import { ensurePublicationDeletionAllowed } from "@/services/deletion-guard-service";
import { publishPublicationJob, refreshPublicationJobStatus } from "@/services/publication/publication-service";
import { assertRequiredString, parseEnumValue, parseOptionalString } from "@/lib/validation";

const PATH = "/publications";

export async function savePublicationJobAction(formData: FormData) {
  const user = await requireAdmin();
  const prisma = getPrisma();
  const id = formData.get("id")?.toString() || undefined;
  const actionName = id ? "save-publication:update" : "save-publication:create";
  const previousJob = id
    ? await prisma.publicationJob.findUnique({
        where: { id },
        select: { raceId: true }
      })
    : null;

  try {
    const raceId = assertRequiredString(formData.get("raceId"), "La course");
    const target = assertRequiredString(formData.get("target"), "La cible", 120);
    const mode = parseEnumValue(formData.get("mode"), "Le mode de publication", PUBLICATION_MODE_OPTIONS) as PublicationMode;
    const payloadTitle = assertRequiredString(formData.get("payloadTitle"), "Le titre editorial", 160);
    const payloadBody = assertRequiredString(formData.get("payloadBody"), "Le corps editorial", 4000);
    const payloadExcerpt = parseOptionalString(formData.get("payloadExcerpt"), 320);

    const race = await prisma.race.findUnique({ where: { id: raceId }, select: { id: true } });
    if (!race) {
      throw new Error("La course selectionnee est introuvable.");
    }

    const payloadJson = {
      title: payloadTitle,
      body: payloadBody,
      excerpt: payloadExcerpt ?? undefined
    };

    const publicationJob = id
      ? await prisma.publicationJob.update({
          where: { id },
          data: {
            raceId,
            target,
            mode,
            payloadJson,
            status: PublicationStatus.DRAFT,
            errorMessage: null,
            publishedAt: null
          }
        })
      : await prisma.publicationJob.create({
          data: {
            raceId,
            target,
            mode,
            payloadJson,
            status: PublicationStatus.DRAFT,
            errorMessage: null,
            publishedAt: null
          }
        });

    if (previousJob?.raceId && previousJob.raceId !== publicationJob.raceId) {
      await syncRacePublicationStatus(previousJob.raceId);
    }

    await syncRacePublicationStatus(publicationJob.raceId);

    await createAuditLog({
      actorId: user.id,
      actionType: id ? AuditActionType.UPDATE : AuditActionType.CREATE,
      entityType: AuditEntityType.PUBLICATION_JOB,
      entityId: publicationJob.id,
      metadataJson: {
        raceId,
        target,
        mode,
        status: publicationJob.status
      }
    });

    revalidatePath(PATH);
    redirectWithFeedback(PATH, "success", id ? "Publication mise a jour en brouillon." : "Publication creee en brouillon.");
  } catch (error) {
    rethrowIfRedirectError(error);
    logServerActionError(actionName, error, {
      userId: user.id,
      id,
      formData: Object.fromEntries(formData.entries())
    });
    const message = getUserFacingActionErrorMessage(
      error,
      error instanceof Error && error.message === "La course selectionnee est introuvable."
        ? error.message
        : "Impossible d'enregistrer la publication."
    );
    redirectWithFeedback(PATH, "error", message, id ? { edit: id } : undefined);
  }
}

export async function validatePublicationJobAction(formData: FormData) {
  const user = await requireAdmin();
  const id = assertRequiredString(formData.get("id"), "L'identifiant publication");

  try {
    const result = await refreshPublicationJobStatus(id, user.id);

    revalidatePath(PATH);
    redirectWithFeedback(
      PATH,
      result.evaluation.isPublishable ? "success" : "error",
      result.evaluation.isPublishable ? "Publication prete pour envoi." : result.evaluation.reasons.join(" ")
    );
  } catch (error) {
    rethrowIfRedirectError(error);
    logServerActionError("validate-publication", error, {
      userId: user.id,
      id
    });
    const message = getUserFacingActionErrorMessage(error, "Impossible de controler la publication.");
    redirectWithFeedback(PATH, "error", message);
  }
}

export async function publishPublicationJobAction(formData: FormData) {
  const user = await requireAdmin();
  const id = assertRequiredString(formData.get("id"), "L'identifiant publication");

  try {
    const result = await publishPublicationJob(id, user.id);

    revalidatePath(PATH);
    redirectWithFeedback(
      PATH,
      result.success ? "success" : "error",
      result.success ? "Publication mock effectuee." : result.errorMessage ?? "La publication a echoue."
    );
  } catch (error) {
    rethrowIfRedirectError(error);
    logServerActionError("publish-publication", error, {
      userId: user.id,
      id
    });
    const message = getUserFacingActionErrorMessage(error, "Impossible de publier ce contenu.");
    redirectWithFeedback(PATH, "error", message);
  }
}

export async function deletePublicationJobAction(formData: FormData) {
  const user = await requireAdmin();
  const prisma = getPrisma();
  const id = assertRequiredString(formData.get("id"), "L'identifiant publication");

  try {
    await ensurePublicationDeletionAllowed(id);
    const deleted = await prisma.publicationJob.delete({ where: { id } });
    await syncRacePublicationStatus(deleted.raceId);

    await createAuditLog({
      actorId: user.id,
      actionType: AuditActionType.DELETE,
      entityType: AuditEntityType.PUBLICATION_JOB,
      entityId: id
    });

    revalidatePath(PATH);
    redirectWithFeedback(PATH, "success", "Publication supprimee.");
  } catch (error) {
    rethrowIfRedirectError(error);
    logServerActionError("delete-publication", error, {
      userId: user.id,
      id
    });
    const message = getUserFacingActionErrorMessage(error, "Impossible de supprimer la publication.");
    redirectWithFeedback(PATH, "error", message);
  }
}
