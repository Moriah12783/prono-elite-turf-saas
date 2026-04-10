"use server";

import { AuditActionType, AuditEntityType, PublicationStatus, RaceStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { PUBLICATION_STATUS_OPTIONS, RACE_STATUS_OPTIONS } from "@/domain/options";
import { getUserFacingActionErrorMessage, logServerActionError, rethrowIfRedirectError } from "@/lib/action-errors";
import { requireAdmin } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { redirectWithFeedback } from "@/lib/feedback";
import { getPrisma } from "@/lib/prisma";
import { ensureCourseDeletionAllowed } from "@/services/deletion-guard-service";
import {
  assertRequiredString,
  combineDateAndTime,
  parseDate,
  parseEnumValue,
  parseInteger,
  parseOptionalInteger,
  parseTime
} from "@/lib/validation";

const PATH = "/courses";

function getListExtras(formData: FormData) {
  return formData.get("archivedView")?.toString() === "1" ? { archived: "1" } : undefined;
}

export async function saveCourseAction(formData: FormData) {
  const user = await requireAdmin();
  const prisma = getPrisma();
  const id = formData.get("id")?.toString() || undefined;
  const actionName = id ? "save-course:update" : "save-course:create";

  try {
    const raceName = assertRequiredString(formData.get("raceName"), "Le nom de la course", 120);
    const venue = assertRequiredString(formData.get("venue"), "L'hippodrome", 120);
    const raceDate = parseDate(formData.get("raceDate"), "La date");
    const raceTime = parseTime(formData.get("raceTime"), "L'heure");
    const discipline = assertRequiredString(formData.get("discipline"), "La discipline", 80);
    const distance = parseInteger(formData.get("distance"), "La distance", { min: 1, max: 10000 });
    const qualityScore = parseOptionalInteger(formData.get("qualityScore"), "Le score qualite", { min: 0, max: 100 });
    const status = parseEnumValue(formData.get("status"), "Le statut course", RACE_STATUS_OPTIONS) as RaceStatus;
    const publicationStatus = parseEnumValue(
      formData.get("publicationStatus"),
      "Le statut publication",
      PUBLICATION_STATUS_OPTIONS
    ) as PublicationStatus;
    const externalSourceId = formData.get("externalSourceId")?.toString().trim() || null;
    const raceDateTime = combineDateAndTime(raceDate, raceTime);

    const savedRace = id
      ? await prisma.race.update({
          where: { id },
          data: {
            raceName,
            venue,
            raceDate,
            raceTime,
            raceDateTime,
            discipline,
            distance,
            qualityScore,
            status,
            publicationStatus,
            externalSourceId
          }
        })
      : await prisma.race.create({
          data: {
            raceName,
            venue,
            raceDate,
            raceTime,
            raceDateTime,
            discipline,
            distance,
            qualityScore,
            status,
            publicationStatus,
            externalSourceId
          }
        });

    await createAuditLog({
      actorId: user.id,
      actionType: id ? AuditActionType.UPDATE : AuditActionType.CREATE,
      entityType: AuditEntityType.RACE,
      entityId: savedRace.id,
      metadataJson: {
        raceName,
        status,
        publicationStatus
      }
    });

    revalidatePath(PATH);
    redirectWithFeedback(PATH, "success", id ? "Course mise a jour." : "Course creee.", getListExtras(formData));
  } catch (error) {
    rethrowIfRedirectError(error);
    logServerActionError(actionName, error, {
      userId: user.id,
      id,
      formData: Object.fromEntries(formData.entries())
    });
    const message = getUserFacingActionErrorMessage(error, "Impossible d'enregistrer la course.");
    redirectWithFeedback(PATH, "error", message, {
      ...(id ? { edit: id } : {}),
      ...(getListExtras(formData) ?? {})
    });
  }
}

export async function deleteCourseAction(formData: FormData) {
  const user = await requireAdmin();
  const prisma = getPrisma();
  const id = assertRequiredString(formData.get("id"), "L'identifiant course");

  try {
    await ensureCourseDeletionAllowed(id);
    await prisma.race.delete({ where: { id } });

    await createAuditLog({
      actorId: user.id,
      actionType: AuditActionType.DELETE,
      entityType: AuditEntityType.RACE,
      entityId: id
    });

    revalidatePath(PATH);
    redirectWithFeedback(PATH, "success", "Course supprimee.", getListExtras(formData));
  } catch (error) {
    rethrowIfRedirectError(error);
    logServerActionError("delete-course", error, {
      userId: user.id,
      id
    });
    const message = getUserFacingActionErrorMessage(error, "Impossible de supprimer la course.");
    redirectWithFeedback(PATH, "error", message, getListExtras(formData));
  }
}

export async function archiveCourseAction(formData: FormData) {
  const user = await requireAdmin();
  const prisma = getPrisma();
  const id = assertRequiredString(formData.get("id"), "L'identifiant course");
  const archivedAt = new Date();

  try {
    const course = await prisma.race.findUnique({
      where: { id },
      select: {
        id: true,
        archivedAt: true,
        prediction: { select: { id: true, archivedAt: true } },
        result: { select: { id: true, archivedAt: true } },
        publicationJobs: { select: { id: true, archivedAt: true } }
      }
    });

    if (!course) {
      throw new Error("La course est introuvable.");
    }

    if (course.archivedAt) {
      throw new Error("Cette course est deja archivee.");
    }

    await prisma.$transaction([
      prisma.race.update({
        where: { id },
        data: {
          archivedAt,
          archivedById: user.id
        }
      }),
      ...(course.prediction && !course.prediction.archivedAt
        ? [
            prisma.prediction.update({
              where: { id: course.prediction.id },
              data: {
                archivedAt,
                archivedById: user.id
              }
            })
          ]
        : []),
      ...(course.result && !course.result.archivedAt
        ? [
            prisma.result.update({
              where: { id: course.result.id },
              data: {
                archivedAt,
                archivedById: user.id
              }
            })
          ]
        : []),
      ...course.publicationJobs
        .filter((job) => !job.archivedAt)
        .map((job) =>
          prisma.publicationJob.update({
            where: { id: job.id },
            data: {
              archivedAt,
              archivedById: user.id
            }
          })
        )
    ]);

    await createAuditLog({
      actorId: user.id,
      actionType: AuditActionType.UPDATE,
      entityType: AuditEntityType.RACE,
      entityId: id,
      metadataJson: {
        operation: "archive"
      }
    });

    revalidatePath(PATH);
    redirectWithFeedback(PATH, "success", "Course archivee. Les fiches liees sensibles ont aussi ete archivees.", getListExtras(formData));
  } catch (error) {
    rethrowIfRedirectError(error);
    logServerActionError("archive-course", error, {
      userId: user.id,
      id
    });
    const message = getUserFacingActionErrorMessage(error, "Impossible d'archiver la course.");
    redirectWithFeedback(PATH, "error", message, getListExtras(formData));
  }
}

export async function restoreCourseAction(formData: FormData) {
  const user = await requireAdmin();
  const prisma = getPrisma();
  const id = assertRequiredString(formData.get("id"), "L'identifiant course");

  try {
    const course = await prisma.race.findUnique({
      where: { id },
      select: { id: true, archivedAt: true }
    });

    if (!course) {
      throw new Error("La course est introuvable.");
    }

    if (!course.archivedAt) {
      throw new Error("Cette course n'est pas archivee.");
    }

    await prisma.race.update({
      where: { id },
      data: {
        archivedAt: null,
        archivedById: null
      }
    });

    await createAuditLog({
      actorId: user.id,
      actionType: AuditActionType.UPDATE,
      entityType: AuditEntityType.RACE,
      entityId: id,
      metadataJson: {
        operation: "restore"
      }
    });

    revalidatePath(PATH);
    redirectWithFeedback(PATH, "success", "Course restauree.", getListExtras(formData));
  } catch (error) {
    rethrowIfRedirectError(error);
    logServerActionError("restore-course", error, {
      userId: user.id,
      id
    });
    const message = getUserFacingActionErrorMessage(error, "Impossible de restaurer la course.");
    redirectWithFeedback(PATH, "error", message, getListExtras(formData));
  }
}
