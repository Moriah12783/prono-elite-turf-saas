import { ApprovalStatus, PublicationStatus, RaceStatus } from "@prisma/client";

import { PublicationPreflightResult } from "@/domain/types";
import { parsePublicationPayload } from "@/lib/publication-payload";
import { getPrisma } from "@/lib/prisma";

const ALLOWED_RACE_STATUSES = new Set<RaceStatus>([
  RaceStatus.VALIDATED,
  RaceStatus.PREDICTION_GENERATED,
  RaceStatus.DRAFT_READY,
  RaceStatus.APPROVED,
  RaceStatus.PUBLISHED,
  RaceStatus.RESULT_INTEGRATED
]);

const ALLOWED_APPROVAL_STATUSES = new Set<ApprovalStatus>([
  ApprovalStatus.APPROVED,
  ApprovalStatus.PUBLISHED
]);

export async function evaluatePublicationJobReadiness(publicationJobId: string): Promise<PublicationPreflightResult> {
  const prisma = getPrisma();
  const job = await prisma.publicationJob.findUnique({
    where: { id: publicationJobId },
    include: {
      race: {
        include: {
          runners: true,
          prediction: true
        }
      }
    }
  });

  if (!job) {
    return {
      isPublishable: false,
      status: PublicationStatus.BLOCKED,
      reasons: ["La publication cible n'existe pas."]
    };
  }

  return evaluatePublicationForJobEntity(job);
}

export function evaluatePublicationForJobEntity(job: {
  race: {
    id: string;
    status: RaceStatus;
    runners: Array<{ number: number; isNonRunner: boolean }>;
    prediction: null | {
      mainPick: string;
      basePick: string;
      outsiderPick: string;
      speculativePick: string;
      analysisText: string;
      cautionText: string;
      approvalStatus: ApprovalStatus;
    };
  };
  payloadJson: unknown;
}): PublicationPreflightResult {
  const reasons: string[] = [];
  const race = job.race;

  if (!race?.id) {
    reasons.push("La course associee est introuvable.");
  }

  if (race && !ALLOWED_RACE_STATUSES.has(race.status)) {
    reasons.push("La course n'est pas validee pour une publication.");
  }

  if (!race?.prediction) {
    reasons.push("Aucun pronostic n'est associe a la course.");
  }

  const prediction = race?.prediction;

  if (prediction) {
    if (!prediction.mainPick || !prediction.basePick || !prediction.outsiderPick || !prediction.speculativePick) {
      reasons.push("Les selections essentielles du pronostic sont incompletes.");
    }

    if (!prediction.analysisText?.trim() || !prediction.cautionText?.trim()) {
      reasons.push("Le contenu editorial du pronostic est incomplet.");
    }

    if (!ALLOWED_APPROVAL_STATUSES.has(prediction.approvalStatus)) {
      reasons.push("Le pronostic n'est pas approuve pour publication.");
    }
  }

  const payload = parsePublicationPayload(job.payloadJson);

  if (!payload?.title || !payload.body) {
    reasons.push("Le contenu editorial a publier est incomplet.");
  }

  const activeRunnerNumbers = new Set(
    race?.runners.filter((runner) => !runner.isNonRunner).map((runner) => String(runner.number)) ?? []
  );

  if (activeRunnerNumbers.size === 0) {
    reasons.push("Aucun partant actif n'est disponible pour cette course.");
  }

  if (prediction) {
    const picks = [prediction.mainPick, prediction.basePick, prediction.outsiderPick, prediction.speculativePick];
    const nonRunnerSelections = picks.filter((pick) => !activeRunnerNumbers.has(String(pick)));

    if (nonRunnerSelections.length > 0) {
      reasons.push(`Une ou plusieurs selections ciblent un non-partant ou un numero absent : ${nonRunnerSelections.join(", ")}.`);
    }
  }

  return {
    isPublishable: reasons.length === 0,
    status: reasons.length === 0 ? PublicationStatus.READY : PublicationStatus.BLOCKED,
    reasons
  };
}
