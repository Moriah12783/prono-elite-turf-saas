import {
  EliteTurfApiPublicationPayload,
  EliteTurfApiPublicationResponse
} from "@/domain/types";

type ValidationResult =
  | { valid: true; payload: EliteTurfApiPublicationPayload }
  | { valid: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateEliteTurfApiPublicationPayload(value: unknown): ValidationResult {
  if (!isRecord(value)) {
    return { valid: false, message: "Le payload doit etre un objet JSON." };
  }

  if (!isNonEmptyString(value.requestId)) {
    return { valid: false, message: "Le champ requestId est obligatoire." };
  }

  if (value.provider !== "api-custom") {
    return { valid: false, message: "Le champ provider doit valoir api-custom." };
  }

  if (!isNonEmptyString(value.target)) {
    return { valid: false, message: "Le champ target est obligatoire." };
  }

  if (!isNonEmptyString(value.mode)) {
    return { valid: false, message: "Le champ mode est obligatoire." };
  }

  if (!isNonEmptyString(value.publicationStatus)) {
    return { valid: false, message: "Le champ publicationStatus est obligatoire." };
  }

  if (!isRecord(value.course)) {
    return { valid: false, message: "Le bloc course est obligatoire." };
  }

  if (!isNonEmptyString(value.course.id)) {
    return { valid: false, message: "Le champ course.id est obligatoire." };
  }

  if (!isNonEmptyString(value.course.raceName)) {
    return { valid: false, message: "Le champ course.raceName est obligatoire." };
  }

  if (!isNonEmptyString(value.course.venue)) {
    return { valid: false, message: "Le champ course.venue est obligatoire." };
  }

  if (!isRecord(value.article)) {
    return { valid: false, message: "Le bloc article est obligatoire." };
  }

  if (!isNonEmptyString(value.article.title)) {
    return { valid: false, message: "Le champ article.title est obligatoire." };
  }

  if (!isNonEmptyString(value.article.content)) {
    return { valid: false, message: "Le champ article.content est obligatoire." };
  }

  if (value.article.contentFormat !== "html") {
    return { valid: false, message: "Le champ article.contentFormat doit valoir html." };
  }

  if (!isRecord(value.metadata)) {
    return { valid: false, message: "Le bloc metadata est obligatoire." };
  }

  if (value.metadata.sourceSystem !== "prono-elite-turf-saas") {
    return { valid: false, message: "Le champ metadata.sourceSystem est invalide." };
  }

  if (!isNonEmptyString(value.metadata.publicationJobId)) {
    return { valid: false, message: "Le champ metadata.publicationJobId est obligatoire." };
  }

  if (!isNonEmptyString(value.metadata.generatedAt)) {
    return { valid: false, message: "Le champ metadata.generatedAt est obligatoire." };
  }

  return {
    valid: true,
    payload: value as EliteTurfApiPublicationPayload
  };
}

export function buildEliteTurfSuccessResponse(
  payload: EliteTurfApiPublicationPayload
): EliteTurfApiPublicationResponse {
  const slug = payload.article.title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const status =
    payload.publicationStatus === "publish"
      ? "published"
      : payload.publicationStatus === "draft"
        ? "draft"
        : "accepted";

  return {
    success: true,
    publicationId: `elite-turf-${payload.requestId}`,
    externalReference: `https://elite-turf.local/publications/${slug || payload.requestId}`,
    status,
    message: "Publication recue avec succes par l'API Elite Turf de test.",
    receivedAt: new Date().toISOString()
  };
}
