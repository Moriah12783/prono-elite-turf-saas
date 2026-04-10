import { PublicationStatus } from "@prisma/client";

import {
  EliteTurfApiPublicationPayload,
  EliteTurfApiPublicationResponse,
  PublicationExecutionResult,
  PublicationProviderInput
} from "@/domain/types";

import { getApiCustomConfig } from "./api-custom-config";

function toIsoString(value?: Date): string | undefined {
  return value instanceof Date ? value.toISOString() : undefined;
}

export function createEliteTurfApiPayload(
  input: PublicationProviderInput,
  defaultStatus: string
): EliteTurfApiPublicationPayload {
  return {
    requestId: input.publicationJobId,
    provider: "api-custom",
    target: "elite-turf",
    mode: input.mode,
    publicationStatus: defaultStatus,
    course: {
      id: input.race.id,
      raceName: input.race.raceName,
      venue: input.race.venue,
      raceDateTime: toIsoString(input.race.raceDateTime)
    },
    article: {
      title: input.payload.title,
      excerpt: input.payload.excerpt,
      content: input.payload.body,
      contentFormat: "html"
    },
    metadata: {
      sourceSystem: "prono-elite-turf-saas",
      publicationJobId: input.publicationJobId,
      generatedAt: new Date().toISOString()
    }
  };
}

function normalizeEliteTurfApiResponse(value: unknown): EliteTurfApiPublicationResponse | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const success = typeof candidate.success === "boolean" ? candidate.success : null;
  const status = typeof candidate.status === "string" ? candidate.status : null;

  if (success === null || status === null) {
    return null;
  }

  return {
    success,
    status: ["accepted", "draft", "published", "failed"].includes(status) ? (status as EliteTurfApiPublicationResponse["status"]) : "failed",
    publicationId: typeof candidate.publicationId === "string" ? candidate.publicationId : undefined,
    externalReference: typeof candidate.externalReference === "string" ? candidate.externalReference : undefined,
    message: typeof candidate.message === "string" ? candidate.message : undefined,
    receivedAt: typeof candidate.receivedAt === "string" ? candidate.receivedAt : undefined
  };
}

function getApiCustomErrorMessage(responseBody: EliteTurfApiPublicationResponse | null, status: number): string {
  if (responseBody?.message) {
    return `API Elite Turf a refuse la publication (${status}) : ${responseBody.message}`;
  }

  return `API Elite Turf a retourne une reponse invalide (${status}).`;
}

export class ApiCustomPublicationProvider {
  async publish(input: PublicationProviderInput): Promise<PublicationExecutionResult> {
    const config = getApiCustomConfig();

    if (!config.enabled) {
      return {
        success: false,
        status: PublicationStatus.FAILED,
        errorMessage: `Configuration api-custom incomplete : ${config.missingFields.join(", ")}.`,
        providerKey: "api-custom",
        deliveryMode: "real",
        responsePayload: null
      };
    }

    const endpoint = new URL(config.endpoint, config.baseUrl).toString();
    const requestBody = createEliteTurfApiPayload(input, config.defaultStatus);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.token}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(requestBody),
        cache: "no-store"
      });

      let responseBody: EliteTurfApiPublicationResponse | null = null;

      try {
        responseBody = normalizeEliteTurfApiResponse(await response.json());
      } catch {
        responseBody = null;
      }

      if (!response.ok) {
        return {
          success: false,
          status: PublicationStatus.FAILED,
          errorMessage: getApiCustomErrorMessage(responseBody, response.status),
          providerKey: "api-custom",
          deliveryMode: "real",
          requestPayload: requestBody,
          responsePayload: responseBody
        };
      }

      const externalReference =
        responseBody?.externalReference ??
        responseBody?.publicationId ??
        null;

      if (!externalReference) {
        return {
          success: false,
          status: PublicationStatus.FAILED,
          errorMessage: "API Elite Turf n'a pas retourne de reference de publication.",
          providerKey: "api-custom",
          deliveryMode: "real",
          requestPayload: requestBody,
          responsePayload: responseBody
        };
      }

      return {
        success: responseBody?.success ?? true,
        status: PublicationStatus.PUBLISHED,
        publishedAt: new Date(),
        externalReference,
        providerKey: "api-custom",
        deliveryMode: "real",
        requestPayload: requestBody,
        responsePayload: responseBody
      };
    } catch (error) {
      return {
        success: false,
        status: PublicationStatus.FAILED,
        errorMessage: error instanceof Error ? `Erreur reseau API custom : ${error.message}` : "Erreur reseau inconnue vers API custom.",
        providerKey: "api-custom",
        deliveryMode: "real",
        requestPayload: requestBody,
        responsePayload: null
      };
    }
  }
}
