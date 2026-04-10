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
