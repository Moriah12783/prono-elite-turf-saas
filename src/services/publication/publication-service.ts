import { AuditActionType, AuditEntityType, PublicationStatus } from "@prisma/client";

import { createAuditLog } from "@/lib/audit";
import { parsePublicationPayload } from "@/lib/publication-payload";
import { getPrisma } from "@/lib/prisma";
import { syncRacePublicationStatus } from "@/lib/publication-sync";

import { resolvePublicationProvider } from "./publication-provider";
import { evaluatePublicationJobReadiness } from "./publication-workflow-service";

export async function refreshPublicationJobStatus(publicationJobId: string, actorId?: string) {
  const prisma = getPrisma();
  const evaluation = await evaluatePublicationJobReadiness(publicationJobId);

  const updatedJob = await prisma.publicationJob.update({
    where: { id: publicationJobId },
    data: {
      status: evaluation.status,
      errorMessage: evaluation.reasons.length ? evaluation.reasons.join(" ") : null,
      publishedAt: evaluation.status === PublicationStatus.PUBLISHED ? new Date() : null
    },
    include: {
      race: true
    }
  });

  await syncRacePublicationStatus(updatedJob.raceId);

  if (actorId) {
    await createAuditLog({
      actorId,
      actionType: AuditActionType.VALIDATE,
      entityType: AuditEntityType.PUBLICATION_JOB,
      entityId: publicationJobId,
      metadataJson: {
        status: updatedJob.status,
        reasons: evaluation.reasons
      }
    });
  }

  return {
    job: updatedJob,
    evaluation
  };
}

export async function publishPublicationJob(publicationJobId: string, actorId?: string) {
  const prisma = getPrisma();
  const validation = await refreshPublicationJobStatus(publicationJobId, actorId);

  if (!validation.evaluation.isPublishable) {
    return {
      success: false,
      status: PublicationStatus.BLOCKED,
      errorMessage: validation.evaluation.reasons.join(" "),
      publishedAt: null,
      providerKey: null,
      deliveryMode: null
    };
  }

  const fullJob = await prisma.publicationJob.findUnique({
    where: { id: publicationJobId },
    include: {
      race: true
    }
  });

  if (!fullJob) {
    return {
      success: false,
      status: PublicationStatus.FAILED,
      errorMessage: "Publication introuvable.",
      publishedAt: null,
      providerKey: null,
      deliveryMode: null
    };
  }

  const payload = parsePublicationPayload(fullJob.payloadJson);

  if (!payload) {
    await prisma.publicationJob.update({
      where: { id: publicationJobId },
      data: {
        status: PublicationStatus.BLOCKED,
        errorMessage: "Payload editorial introuvable ou invalide."
      }
    });

    await syncRacePublicationStatus(fullJob.raceId);

    return {
      success: false,
      status: PublicationStatus.BLOCKED,
      errorMessage: "Payload editorial introuvable ou invalide.",
      publishedAt: null,
      providerKey: null,
      deliveryMode: null
    };
  }

  const provider = resolvePublicationProvider(fullJob.target);
  const result = await provider.publish({
    publicationJobId: fullJob.id,
    target: fullJob.target,
    mode: fullJob.mode,
    payload,
    race: {
      id: fullJob.race.id,
      raceName: fullJob.race.raceName,
      venue: fullJob.race.venue,
      raceTime: fullJob.race.raceTime
    }
  });

  const updatedJob = await prisma.publicationJob.update({
    where: { id: publicationJobId },
    data: {
      status: result.status,
      publishedAt: result.publishedAt ?? null,
      errorMessage: result.errorMessage ?? null,
      payloadJson: {
        ...payload,
        externalReference: result.externalReference ?? null,
        providerKey: result.providerKey ?? null,
        deliveryMode: result.deliveryMode ?? null
      }
    }
  });

  await syncRacePublicationStatus(updatedJob.raceId);

  if (actorId) {
    await createAuditLog({
      actorId,
      actionType: AuditActionType.PUBLISH,
      entityType: AuditEntityType.PUBLICATION_JOB,
      entityId: publicationJobId,
      metadataJson: {
        status: updatedJob.status,
        publishedAt: updatedJob.publishedAt,
        errorMessage: updatedJob.errorMessage,
        providerKey: result.providerKey ?? null,
        deliveryMode: result.deliveryMode ?? null
      }
    });
  }

  return {
    success: result.success,
    status: updatedJob.status,
    errorMessage: updatedJob.errorMessage,
    publishedAt: updatedJob.publishedAt,
    providerKey: result.providerKey ?? null,
    deliveryMode: result.deliveryMode ?? null
  };
}
