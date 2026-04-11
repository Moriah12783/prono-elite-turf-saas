import { ScheduledJobKey } from "@prisma/client";

export type ScheduledJobDefinition = {
  key: ScheduledJobKey;
  label: string;
  description: string;
  caution: string;
  recommendedDryRun: boolean;
  executionWindowUtc: {
    startHour: number;
    endHour: number;
  };
};

export const scheduledJobDefinitions: ScheduledJobDefinition[] = [
  {
    key: ScheduledJobKey.PREPARE_DAILY_PUBLICATIONS,
    label: "Preparation des publications du jour",
    description: "Repere les courses du jour eligibles et peut creer les brouillons de publication manquants.",
    caution: "Ne cree rien en simulation. En execution reelle, seuls des brouillons prudents sont prepares.",
    recommendedDryRun: true,
    executionWindowUtc: {
      startHour: 5,
      endHour: 9
    }
  },
  {
    key: ScheduledJobKey.VALIDATE_READY_PUBLICATIONS,
    label: "Controle des publications pretes",
    description: "Rejoue les verifications metier sur les jobs actifs de la journee pour mettre a jour READY ou BLOCKED.",
    caution: "Aucune diffusion externe. Ce job ne fait que controler l'etat metier des publications.",
    recommendedDryRun: false,
    executionWindowUtc: {
      startHour: 9,
      endHour: 12
    }
  },
  {
    key: ScheduledJobKey.ATTEMPT_AUTOMATIC_PUBLICATIONS,
    label: "Tentative de publication automatique",
    description: "Tente d'envoyer uniquement les jobs READY dans un mode compatible avec l'automatisation.",
    caution: "Les jobs MANUAL sont ignores. Les providers non configures restent sur leurs garde-fous mock/prepared.",
    recommendedDryRun: true,
    executionWindowUtc: {
      startHour: 12,
      endHour: 18
    }
  }
];

export function getScheduledJobDefinition(jobKey: ScheduledJobKey) {
  return scheduledJobDefinitions.find((job) => job.key === jobKey) ?? null;
}

export function formatExecutionWindow(definition: ScheduledJobDefinition) {
  const { startHour, endHour } = definition.executionWindowUtc;
  return `${String(startHour).padStart(2, "0")}:00-${String(endHour).padStart(2, "0")}:00 UTC`;
}

export function formatRecommendedMode(definition: ScheduledJobDefinition) {
  return definition.recommendedDryRun ? "Simulation recommandee" : "Execution reelle recommandee";
}
