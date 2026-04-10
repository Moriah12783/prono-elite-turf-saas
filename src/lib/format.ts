const labels: Record<string, string> = {
  ADMIN: "Admin",
  EDITOR: "Editeur",
  SUPER_ADMIN: "Super admin",
  COLLECTED: "Collectee",
  PENDING_VALIDATION: "En attente",
  VALIDATED: "Valide",
  PREDICTION_GENERATED: "Pronostic genere",
  DRAFT_READY: "Brouillon pret",
  APPROVED: "Approuve",
  PUBLISHED: "Publie",
  ARCHIVED: "Archive",
  RESULT_INTEGRATED: "Resultat integre",
  DRAFT: "Brouillon",
  READY: "Pret",
  BLOCKED: "Bloque",
  FAILED: "Echec",
  DECLARED: "Declare",
  NON_RUNNER: "Non-partant",
  CONFIRMED: "Confirme",
  PENDING_REVIEW: "En revue",
  REJECTED: "Rejete",
  LOW: "Faible",
  MEDIUM: "Moyenne",
  HIGH: "Forte",
  VERY_HIGH: "Tres forte",
  PENDING: "En attente",
  PARTIAL: "Partiel",
  OFFICIAL: "Officiel",
  MANUAL: "Manuel",
  AUTO_DRAFT: "Brouillon auto",
  CONDITIONAL_AUTOMATIC: "Automatique conditionnel",
  CREATE: "Creation",
  UPDATE: "Modification",
  DELETE: "Suppression",
  VALIDATE: "Validation",
  APPROVE: "Approbation",
  PUBLISH: "Publication",
  LOGIN: "Connexion",
  LOGOUT: "Deconnexion",
  USER: "Utilisateur",
  RACE: "Course",
  RUNNER: "Partant",
  PREDICTION: "Pronostic",
  RESULT: "Resultat",
  PUBLICATION_JOB: "Publication",
  AUTH_SESSION: "Session"
};

export function formatStatusLabel(value: string) {
  return labels[value] ?? value;
}

export function formatOdds(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const numeric = typeof value === "number" ? value : Number(value);
  return `${numeric.toFixed(1)}x`;
}

export function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

export function formatDateTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}
