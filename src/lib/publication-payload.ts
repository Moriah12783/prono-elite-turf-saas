import { PublicationPayloadDraft } from "@/domain/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parsePublicationPayload(value: unknown): PublicationPayloadDraft | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = typeof value.title === "string" ? value.title.trim() : "";
  const body = typeof value.body === "string" ? value.body.trim() : "";
  const excerpt = typeof value.excerpt === "string" ? value.excerpt.trim() : undefined;

  if (!title && !body && !excerpt) {
    return null;
  }

  return { title, body, excerpt };
}

export function parsePublicationDeliveryMeta(value: unknown): {
  providerKey?: string;
  deliveryMode?: string;
  externalReference?: string;
} | null {
  if (!isRecord(value)) {
    return null;
  }

  const providerKey = typeof value.providerKey === "string" ? value.providerKey : undefined;
  const deliveryMode = typeof value.deliveryMode === "string" ? value.deliveryMode : undefined;
  const externalReference = typeof value.externalReference === "string" ? value.externalReference : undefined;

  if (!providerKey && !deliveryMode && !externalReference) {
    return null;
  }

  return {
    providerKey,
    deliveryMode,
    externalReference
  };
}

export function parsePublicationDebugMeta(value: unknown): {
  lastAttemptAt?: string;
  sentPayload?: unknown;
  receivedResponse?: unknown;
} | null {
  if (!isRecord(value) || !isRecord(value.debug)) {
    return null;
  }

  const debug = value.debug;
  const lastAttemptAt = typeof debug.lastAttemptAt === "string" ? debug.lastAttemptAt : undefined;
  const sentPayload = "sentPayload" in debug ? debug.sentPayload : undefined;
  const receivedResponse = "receivedResponse" in debug ? debug.receivedResponse : undefined;

  if (!lastAttemptAt && sentPayload === undefined && receivedResponse === undefined) {
    return null;
  }

  return {
    lastAttemptAt,
    sentPayload,
    receivedResponse
  };
}

export type PublicationAttemptHistoryEntry = {
  attemptedAt?: string;
  providerKey?: string;
  target?: string;
  deliveryMode?: string;
  status?: string;
  externalReference?: string;
  errorMessage?: string;
  sentPayload?: unknown;
  receivedResponse?: unknown;
  publishedAt?: string;
};

export function parsePublicationAttemptHistory(value: unknown): PublicationAttemptHistoryEntry[] {
  if (!isRecord(value) || !Array.isArray(value.debugHistory)) {
    return [];
  }

  return value.debugHistory
    .filter(isRecord)
    .map((entry) => ({
      attemptedAt: typeof entry.attemptedAt === "string" ? entry.attemptedAt : undefined,
      providerKey: typeof entry.providerKey === "string" ? entry.providerKey : undefined,
      target: typeof entry.target === "string" ? entry.target : undefined,
      deliveryMode: typeof entry.deliveryMode === "string" ? entry.deliveryMode : undefined,
      status: typeof entry.status === "string" ? entry.status : undefined,
      externalReference: typeof entry.externalReference === "string" ? entry.externalReference : undefined,
      errorMessage: typeof entry.errorMessage === "string" ? entry.errorMessage : undefined,
      sentPayload: "sentPayload" in entry ? entry.sentPayload : undefined,
      receivedResponse: "receivedResponse" in entry ? entry.receivedResponse : undefined,
      publishedAt: typeof entry.publishedAt === "string" ? entry.publishedAt : undefined
    }));
}
