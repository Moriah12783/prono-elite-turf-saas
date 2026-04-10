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
