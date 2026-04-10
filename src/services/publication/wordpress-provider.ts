import { PublicationStatus } from "@prisma/client";

import { PublicationExecutionResult, PublicationPayloadDraft, PublicationProviderInput } from "@/domain/types";

import { getWordPressConfig } from "./wordpress-config";

type WordPressPostResponse = {
  id?: number;
  link?: string;
  status?: string;
  message?: string;
  code?: string;
};

function createWordPressContent(input: PublicationProviderInput): string {
  const sections = [
    `<p><strong>Course :</strong> ${input.race.raceName} - ${input.race.venue} - ${input.race.raceTime}</p>`,
    ...input.payload.body
      .split(/\r?\n\r?\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .map((paragraph) => `<p>${paragraph.replace(/\r?\n/g, "<br />")}</p>`)
  ];

  return sections.join("\n");
}

function createWordPressRequestBody(input: PublicationProviderInput, payload: PublicationPayloadDraft, defaultStatus: string) {
  return {
    title: payload.title,
    content: createWordPressContent(input),
    excerpt: payload.excerpt ?? "",
    status: defaultStatus
  };
}

function getResponseErrorMessage(responseBody: WordPressPostResponse | null, status: number): string {
  if (responseBody?.message) {
    return `WordPress a refuse la publication (${status}) : ${responseBody.message}`;
  }

  return `WordPress a retourne une reponse invalide (${status}).`;
}

export class WordPressPublicationProvider {
  async publish(input: PublicationProviderInput): Promise<PublicationExecutionResult> {
    const config = getWordPressConfig();

    if (!config.enabled) {
      return {
        success: false,
        status: PublicationStatus.FAILED,
        errorMessage: `Configuration WordPress incomplete : ${config.missingFields.join(", ")}.`,
        providerKey: "wordpress-rest",
        deliveryMode: "real",
        responsePayload: null
      };
    }

    const endpoint = new URL(config.postsEndpoint, config.baseUrl).toString();
    const authToken = Buffer.from(`${config.username}:${config.appPassword}`).toString("base64");
    const requestBody = createWordPressRequestBody(input, input.payload, config.defaultStatus);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Basic ${authToken}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(requestBody),
        cache: "no-store"
      });

      let responseBody: WordPressPostResponse | null = null;

      try {
        responseBody = (await response.json()) as WordPressPostResponse;
      } catch {
        responseBody = null;
      }

      if (!response.ok) {
        return {
          success: false,
          status: PublicationStatus.FAILED,
          errorMessage: getResponseErrorMessage(responseBody, response.status),
          providerKey: "wordpress-rest",
          deliveryMode: "real",
          requestPayload: requestBody,
          responsePayload: responseBody
        };
      }

      if (!responseBody?.id) {
        return {
          success: false,
          status: PublicationStatus.FAILED,
          errorMessage: "WordPress n'a pas retourne d'identifiant de post.",
          providerKey: "wordpress-rest",
          deliveryMode: "real",
          requestPayload: requestBody,
          responsePayload: responseBody
        };
      }

      return {
        success: true,
        status: PublicationStatus.PUBLISHED,
        publishedAt: new Date(),
        externalReference: responseBody.link ?? `wordpress:${responseBody.id}`,
        providerKey: "wordpress-rest",
        deliveryMode: "real",
        requestPayload: requestBody,
        responsePayload: responseBody
      };
    } catch (error) {
      return {
        success: false,
        status: PublicationStatus.FAILED,
        errorMessage: error instanceof Error ? `Erreur reseau WordPress : ${error.message}` : "Erreur reseau inconnue vers WordPress.",
        providerKey: "wordpress-rest",
        deliveryMode: "real",
        requestPayload: requestBody,
        responsePayload: null
      };
    }
  }
}
