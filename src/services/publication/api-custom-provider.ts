import { PublicationStatus } from "@prisma/client";

import { PublicationExecutionResult, PublicationProviderInput } from "@/domain/types";

import { getApiCustomConfig } from "./api-custom-config";

type ApiCustomResponse = {
  id?: string | number;
  reference?: string;
  url?: string;
  status?: string;
  message?: string;
  code?: string;
};

function createApiCustomRequestBody(input: PublicationProviderInput, defaultStatus: string) {
  return {
    publicationJobId: input.publicationJobId,
    provider: "api-custom",
    target: input.target,
    mode: input.mode,
    publicationStatus: defaultStatus,
    article: {
      title: input.payload.title,
      body: input.payload.body,
      excerpt: input.payload.excerpt ?? ""
    },
    race: {
      id: input.race.id,
      raceName: input.race.raceName,
      venue: input.race.venue,
      raceTime: input.race.raceTime
    }
  };
}

function getApiCustomErrorMessage(responseBody: ApiCustomResponse | null, status: number): string {
  if (responseBody?.message) {
    return `API custom a refuse la publication (${status}) : ${responseBody.message}`;
  }

  return `API custom a retourne une reponse invalide (${status}).`;
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
        deliveryMode: "real"
      };
    }

    const endpoint = new URL(config.endpoint, config.baseUrl).toString();
    const requestBody = createApiCustomRequestBody(input, config.defaultStatus);

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

      let responseBody: ApiCustomResponse | null = null;

      try {
        responseBody = (await response.json()) as ApiCustomResponse;
      } catch {
        responseBody = null;
      }

      if (!response.ok) {
        return {
          success: false,
          status: PublicationStatus.FAILED,
          errorMessage: getApiCustomErrorMessage(responseBody, response.status),
          providerKey: "api-custom",
          deliveryMode: "real"
        };
      }

      const externalReference =
        responseBody?.url ??
        responseBody?.reference ??
        (responseBody?.id ? `api-custom:${responseBody.id}` : null);

      if (!externalReference) {
        return {
          success: false,
          status: PublicationStatus.FAILED,
          errorMessage: "API custom n'a pas retourne de reference de publication.",
          providerKey: "api-custom",
          deliveryMode: "real"
        };
      }

      return {
        success: true,
        status: PublicationStatus.PUBLISHED,
        publishedAt: new Date(),
        externalReference,
        providerKey: "api-custom",
        deliveryMode: "real"
      };
    } catch (error) {
      return {
        success: false,
        status: PublicationStatus.FAILED,
        errorMessage: error instanceof Error ? `Erreur reseau API custom : ${error.message}` : "Erreur reseau inconnue vers API custom.",
        providerKey: "api-custom",
        deliveryMode: "real"
      };
    }
  }
}
