"use server";

import { AuditActionType, AuditEntityType, PublicationMode, PublicationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { PUBLICATION_MODE_OPTIONS, PUBLICATION_TARGET_OPTIONS } from "@/domain/options";
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

function getListExtras(formData: FormData) {
  return formData.get("archivedView")?.toString() === "1" ? { archived: "1" } : undefined;
}

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
    const target = parseEnumValue(formData.get("target"), "La cible de publication", PUBLICATION_TARGET_OPTIONS);
    const mode = parseEnumValue(formData.get("mode"), "Le mode de publication", PUBLICATION_MODE_OPTIONS) as PublicationMode;
    const payloadTitle = assertRequiredString(formData.get("payloadTitle"), "Le titre editorial", 160);
    const payloadBody = assertRequiredString(formData.get("payloadBody"), "Le corps editorial", 4000);
    const payloadExcerpt = parseOptionalString(formData.get("payloadExcerpt"), 320);

    const race = await prisma.race.findFirst({ where: { id: raceId, archivedAt: null }, select: { id: true } });
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
    redirectWithFeedback(
      PATH,
      "success",
      id ? "Publication mise a jour en brouillon." : "Publication creee en brouillon.",
      getListExtras(formData)
    );
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
    redirectWithFeedback(PATH, "error", message, {
      ...(id ? { edit: id } : {}),
      ...(getListExtras(formData) ?? {})
    });
  }
}

export async function validatePublicationJobAction(formData: FormData) {
  const user = await requireAdmin();
  const id = assertRequiredString(formData.get("id"), "L'identifiant publication");

  try {
    const result = await refreshPublicationJobStatus(id, user.id);

    revalidatePath(PATH);
    redirectWithFeedback(PATH, result.evaluation.isPublishable ? "success" : "error", result.evaluation.isPublishable ? "Publication prete pour envoi." : result.evaluation.reasons.join(" "), getListExtras(formData));
  } catch (error) {
    rethrowIfRedirectError(error);
    logServerActionError("validate-publication", error, {
      userId: user.id,
      id
    });
    const message = getUserFacingActionErrorMessage(error, "Impossible de controler la publication.");
    redirectWithFeedback(PATH, "error", message, getListExtras(formData));
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
      result.success
        ? result.deliveryMode === "real"
          ? "Publication transmise au provider reel."
          : "Publication effectuee en mode mock."
        : result.errorMessage ?? "La publication a echoue.",
      getListExtras(formData)
    );
  } catch (error) {
    rethrowIfRedirectError(error);
    logServerActionError("publish-publication", error, {
      userId: user.id,
      id
    });
    const message = getUserFacingActionErrorMessage(error, "Impossible de publier ce contenu.");
    redirectWithFeedback(PATH, "error", message, getListExtras(formData));
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
    redirectWithFeedback(PATH, "success", "Publication supprimee.", getListExtras(formData));
  } catch (error) {
    rethrowIfRedirectError(error);
    logServerActionError("delete-publication", error, {
      userId: user.id,
      id
    });
    const message = getUserFacingActionErrorMessage(error, "Impossible de supprimer la publication.");
    redirectWithFeedback(PATH, "error", message, getListExtras(formData));
  }
}

export async function archivePublicationJobAction(formData: FormData) {
  const user = await requireAdmin();
  const prisma = getPrisma();
  const id = assertRequiredString(formData.get("id"), "L'identifiant publication");

  try {
    const publication = await prisma.publicationJob.findUnique({
      where: { id },
      select: {
        id: true,
        archivedAt: true,
        raceId: true
      }
    });

    if (!publication) {
      throw new Error("La publication est introuvable.");
    }

    if (publication.archivedAt) {
      throw new Error("Cette publication est deja archivee.");
    }

    await prisma.publicationJob.update({
      where: { id },
      data: {
        archivedAt: new Date(),
        archivedById: user.id
      }
    });
    await syncRacePublicationStatus(publication.raceId);

    await createAuditLog({
      actorId: user.id,
      actionType: AuditActionType.UPDATE,
      entityType: AuditEntityType.PUBLICATION_JOB,
      entityId: id,
      metadataJson: {
        operation: "archive"
      }
    });

    revalidatePath(PATH);
    redirectWithFeedback(PATH, "success", "Publication archivee.", getListExtras(formData));
  } catch (error) {
    rethrowIfRedirectError(error);
    logServerActionError("archive-publication", error, {
      userId: user.id,
      id
    });
    const message = getUserFacingActionErrorMessage(error, "Impossible d'archiver la publication.");
    redirectWithFeedback(PATH, "error", message, getListExtras(formData));
  }
}

export async function restorePublicationJobAction(formData: FormData) {
  const user = await requireAdmin();
  const prisma = getPrisma();
  const id = assertRequiredString(formData.get("id"), "L'identifiant publication");

  try {
    const publication = await prisma.publicationJob.findUnique({
      where: { id },
      select: {
        id: true,
        archivedAt: true,
        raceId: true,
        race: {
          select: {
            archivedAt: true
          }
        }
      }
    });

    if (!publication) {
      throw new Error("La publication est introuvable.");
    }

    if (!publication.archivedAt) {
      throw new Error("Cette publication n'est pas archivee.");
    }

    if (publication.race.archivedAt) {
      throw new Error("Restauration impossible : la course liee est archivee.");
    }

    await prisma.publicationJob.update({
      where: { id },
      data: {
        archivedAt: null,
        archivedById: null
      }
    });
    await syncRacePublicationStatus(publication.raceId);

    await createAuditLog({
      actorId: user.id,
      actionType: AuditActionType.UPDATE,
      entityType: AuditEntityType.PUBLICATION_JOB,
      entityId: id,
      metadataJson: {
        operation: "restore"
      }
    });

    revalidatePath(PATH);
    redirectWithFeedback(PATH, "success", "Publication restauree.", getListExtras(formData));
  } catch (error) {
    rethrowIfRedirectError(error);
    logServerActionError("restore-publication", error, {
      userId: user.id,
      id
    });
    const message = getUserFacingActionErrorMessage(error, "Impossible de restaurer la publication.");
    redirectWithFeedback(PATH, "error", message, getListExtras(formData));
  }
}
