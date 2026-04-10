import { PublicationStatus } from "@prisma/client";

import { DeletionBlockedError } from "@/lib/action-errors";
import { getPrisma } from "@/lib/prisma";

const BLOCKING_PUBLICATION_STATUSES: PublicationStatus[] = [
  PublicationStatus.READY,
  PublicationStatus.BLOCKED,
  PublicationStatus.PUBLISHED
];

export async function ensureCourseDeletionAllowed(courseId: string) {
  const prisma = getPrisma();
  const course = await prisma.race.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      runners: { select: { id: true }, take: 1 },
      prediction: { select: { id: true } },
      result: { select: { id: true } },
      publicationJobs: { select: { id: true }, take: 1 }
    }
  });

  if (!course) {
    throw new Error("La course est introuvable.");
  }

  if (course.runners.length > 0) {
    throw new DeletionBlockedError("Suppression impossible : cette course est liee a un ou plusieurs partants.");
  }

  if (course.prediction) {
    throw new DeletionBlockedError("Suppression impossible : cette course est liee a un pronostic.");
  }

  if (course.result) {
    throw new DeletionBlockedError("Suppression impossible : cette course est liee a un resultat.");
  }

  if (course.publicationJobs.length > 0) {
    throw new DeletionBlockedError("Suppression impossible : cette course est liee a une ou plusieurs publications.");
  }
}

export async function ensureRunnerDeletionAllowed(runnerId: string) {
  const prisma = getPrisma();
  const runner = await prisma.runner.findUnique({
    where: { id: runnerId },
    select: {
      id: true,
      number: true,
      race: {
        select: {
          id: true,
          publicationJobs: {
            select: {
              id: true,
              status: true
            }
          },
          prediction: {
            select: {
              id: true,
              mainPick: true,
              basePick: true,
              outsiderPick: true,
              speculativePick: true
            }
          }
        }
      }
    }
  });

  if (!runner) {
    throw new Error("Le partant est introuvable.");
  }

  const runnerNumber = String(runner.number);
  const prediction = runner.race.prediction;
  const linkedToPrediction =
    prediction &&
    [prediction.mainPick, prediction.basePick, prediction.outsiderPick, prediction.speculativePick].includes(runnerNumber);

  if (linkedToPrediction) {
    throw new DeletionBlockedError("Suppression impossible : ce partant est reference dans le pronostic de la course.");
  }

  const blockingPublication = runner.race.publicationJobs.find((job) =>
    BLOCKING_PUBLICATION_STATUSES.includes(job.status)
  );

  if (blockingPublication) {
    throw new DeletionBlockedError("Suppression impossible : ce partant appartient a une course deja engagee dans le workflow de publication.");
  }

  return runner.race.id;
}

export async function ensurePredictionDeletionAllowed(predictionId: string) {
  const prisma = getPrisma();
  const prediction = await prisma.prediction.findUnique({
    where: { id: predictionId },
    select: {
      id: true,
      raceId: true,
      race: {
        select: {
          result: { select: { id: true } },
          publicationJobs: {
            select: {
              id: true,
              status: true
            }
          }
        }
      }
    }
  });

  if (!prediction) {
    throw new Error("Le pronostic est introuvable.");
  }

  if (prediction.race.result) {
    throw new DeletionBlockedError("Suppression impossible : ce pronostic est deja rattache a un resultat de course.");
  }

  const blockingPublication = prediction.race.publicationJobs.find((job) =>
    BLOCKING_PUBLICATION_STATUSES.includes(job.status)
  );

  if (blockingPublication) {
    throw new DeletionBlockedError("Suppression impossible : ce pronostic est deja lie a une publication.");
  }
}

export async function ensureResultDeletionAllowed(resultId: string) {
  const prisma = getPrisma();
  const result = await prisma.result.findUnique({
    where: { id: resultId },
    select: {
      id: true,
      race: {
        select: {
          publicationJobs: {
            select: {
              id: true,
              status: true
            }
          }
        }
      }
    }
  });

  if (!result) {
    throw new Error("Le resultat est introuvable.");
  }

  const publishedPublication = result.race.publicationJobs.find((job) => job.status === PublicationStatus.PUBLISHED);

  if (publishedPublication) {
    throw new DeletionBlockedError("Suppression impossible : ce resultat est rattache a une publication deja diffusee.");
  }
}

export async function ensurePublicationDeletionAllowed(publicationId: string) {
  const prisma = getPrisma();
  const publication = await prisma.publicationJob.findUnique({
    where: { id: publicationId },
    select: {
      id: true,
      status: true
    }
  });

  if (!publication) {
    throw new Error("La publication est introuvable.");
  }

  if (publication.status === PublicationStatus.PUBLISHED) {
    throw new DeletionBlockedError("Suppression impossible : cette publication a deja ete diffusee.");
  }
}
