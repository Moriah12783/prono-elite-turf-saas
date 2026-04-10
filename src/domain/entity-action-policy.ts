import { PublicationStatus } from "@prisma/client";

const BLOCKING_PUBLICATION_STATUSES: PublicationStatus[] = [
  PublicationStatus.READY,
  PublicationStatus.BLOCKED,
  PublicationStatus.PUBLISHED
];

type ActionState = {
  allowed: boolean;
  reason?: string;
};

export type EntityActionPolicy = {
  archive: ActionState;
  restore: ActionState;
  delete: ActionState;
  guidance: string;
};

function blocked(reason: string): ActionState {
  return { allowed: false, reason };
}

function allowed(): ActionState {
  return { allowed: true };
}

export function getRaceActionPolicy(race: {
  archivedAt: Date | null;
}) : EntityActionPolicy {
  if (race.archivedAt) {
    return {
      archive: blocked("Deja archivee"),
      restore: allowed(),
      delete: blocked("Suppression physique desactivee pour preserver l'historique"),
      guidance: "Course sensible : utiliser la restauration plutot qu'une suppression."
    };
  }

  return {
    archive: allowed(),
    restore: blocked("Non archivee"),
    delete: blocked("Utiliser l'archivage pour les courses"),
    guidance: "Course sensible : l'archivage remplace la suppression dans l'UI."
  };
}

export function getPredictionActionPolicy(prediction: {
  archivedAt: Date | null;
  race: {
    archivedAt?: Date | null;
  };
}): EntityActionPolicy {
  if (prediction.archivedAt) {
    return {
      archive: blocked("Deja archive"),
      restore: prediction.race.archivedAt
        ? blocked("Course liee archivee")
        : allowed(),
      delete: blocked("Suppression physique desactivee pour preserver l'historique"),
      guidance: "Pronostic sensible : restaurer seulement si la course est active."
    };
  }

  return {
    archive: allowed(),
    restore: blocked("Non archive"),
    delete: blocked("Utiliser l'archivage pour les pronostics"),
    guidance: "Pronostic sensible : l'archivage remplace la suppression dans l'UI."
  };
}

export function getResultActionPolicy(result: {
  archivedAt: Date | null;
  race: {
    archivedAt?: Date | null;
  };
}): EntityActionPolicy {
  if (result.archivedAt) {
    return {
      archive: blocked("Deja archive"),
      restore: result.race.archivedAt
        ? blocked("Course liee archivee")
        : allowed(),
      delete: blocked("Suppression physique desactivee pour preserver l'historique"),
      guidance: "Resultat sensible : restaurer seulement si la course est active."
    };
  }

  return {
    archive: allowed(),
    restore: blocked("Non archive"),
    delete: blocked("Utiliser l'archivage pour les resultats"),
    guidance: "Resultat sensible : l'archivage remplace la suppression dans l'UI."
  };
}

export function getPublicationActionPolicy(publication: {
  archivedAt: Date | null;
  race: {
    archivedAt?: Date | null;
  };
}): EntityActionPolicy {
  if (publication.archivedAt) {
    return {
      archive: blocked("Deja archivee"),
      restore: publication.race.archivedAt
        ? blocked("Course liee archivee")
        : allowed(),
      delete: blocked("Suppression physique desactivee pour preserver l'historique"),
      guidance: "Publication sensible : restaurer seulement si la course est active."
    };
  }

  return {
    archive: allowed(),
    restore: blocked("Non archivee"),
    delete: blocked("Utiliser l'archivage pour les publications"),
    guidance: "Publication sensible : l'archivage remplace la suppression dans l'UI."
  };
}

export function getRunnerActionPolicy(runner: {
  number: number;
  race: {
    prediction: {
      mainPick: string;
      basePick: string;
      outsiderPick: string;
      speculativePick: string;
    } | null;
    publicationJobs: {
      status: PublicationStatus;
    }[];
  };
}): EntityActionPolicy {
  const runnerNumber = String(runner.number);
  const prediction = runner.race.prediction;
  const linkedToPrediction =
    prediction &&
    [prediction.mainPick, prediction.basePick, prediction.outsiderPick, prediction.speculativePick].includes(runnerNumber);

  const publicationLocked = runner.race.publicationJobs.some((job) =>
    BLOCKING_PUBLICATION_STATUSES.includes(job.status)
  );

  if (linkedToPrediction) {
    return {
      archive: blocked("Archivage non disponible sur les partants"),
      restore: blocked("Non applicable"),
      delete: blocked("Utilise dans le pronostic"),
      guidance: "Ce partant est reference dans le pronostic de la course."
    };
  }

  if (publicationLocked) {
    return {
      archive: blocked("Archivage non disponible sur les partants"),
      restore: blocked("Non applicable"),
      delete: blocked("Course engagee en publication"),
      guidance: "Suppression bloquee car la course est deja engagee dans le workflow de publication."
    };
  }

  return {
    archive: blocked("Archivage non disponible sur les partants"),
    restore: blocked("Non applicable"),
    delete: allowed(),
    guidance: "Partant detail : suppression physique autorisee tant qu'aucune relation critique n'est active."
  };
}
