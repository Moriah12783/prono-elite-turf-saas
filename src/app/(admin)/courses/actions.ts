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
    redirectWithFeedback(PATH, "success", id ? "Course mise a jour." : "Course creee.");
  } catch (error) {
    rethrowIfRedirectError(error);
    logServerActionError(actionName, error, {
      userId: user.id,
      id,
      formData: Object.fromEntries(formData.entries())
    });
    const message = getUserFacingActionErrorMessage(error, "Impossible d'enregistrer la course.");
    redirectWithFeedback(PATH, "error", message, id ? { edit: id } : undefined);
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
    redirectWithFeedback(PATH, "success", "Course supprimee.");
  } catch (error) {
    rethrowIfRedirectError(error);
    logServerActionError("delete-course", error, {
      userId: user.id,
      id
    });
    const message = getUserFacingActionErrorMessage(error, "Impossible de supprimer la course.");
    redirectWithFeedback(PATH, "error", message);
  }
}
