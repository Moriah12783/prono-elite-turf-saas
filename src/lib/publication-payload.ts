import { PublicationPayloadDraft } from "@/domain/types";

export function parsePublicationPayload(value: unknown): PublicationPayloadDraft | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const title = typeof candidate.title === "string" ? candidate.title.trim() : "";
  const body = typeof candidate.body === "string" ? candidate.body.trim() : "";
  const excerpt = typeof candidate.excerpt === "string" ? candidate.excerpt.trim() : undefined;

  if (!title && !body && !excerpt) {
    return null;
  }

  return { title, body, excerpt };
}
