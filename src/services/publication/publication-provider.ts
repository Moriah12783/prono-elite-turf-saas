import { PublicationStatus } from "@prisma/client";

import { PublicationExecutionResult, PublicationProviderInput } from "@/domain/types";

import { getApiCustomConfig } from "./api-custom-config";
import { ApiCustomPublicationProvider } from "./api-custom-provider";
import { WordPressPublicationProvider } from "./wordpress-provider";
import { getWordPressConfig } from "./wordpress-config";
import { normalizePublicationTarget } from "./publication-targets";

export interface PublicationProvider {
  publish(input: PublicationProviderInput): Promise<PublicationExecutionResult>;
}

class MockPublicationProvider implements PublicationProvider {
  async publish(input: PublicationProviderInput): Promise<PublicationExecutionResult> {
    const normalizedTarget = normalizePublicationTarget(input.target);

    if (!normalizedTarget) {
      return {
        success: false,
        status: PublicationStatus.FAILED,
        errorMessage: "Aucun adaptateur mock n'est disponible pour cette cible.",
        externalReference: undefined,
        providerKey: "mock",
        deliveryMode: "mock"
      };
    }

    return {
      success: true,
      status: PublicationStatus.PUBLISHED,
      publishedAt: new Date(),
      externalReference: `mock-${input.publicationJobId}`,
      providerKey: "mock",
      deliveryMode: "mock"
    };
  }
}

export function resolvePublicationProvider(target: string): PublicationProvider {
  const normalizedTarget = normalizePublicationTarget(target);

  if (normalizedTarget === "wordpress-rest" && getWordPressConfig().enabled) {
    return new WordPressPublicationProvider();
  }

  if (normalizedTarget === "api-custom" && getApiCustomConfig().enabled) {
    return new ApiCustomPublicationProvider();
  }

  return new MockPublicationProvider();
}
