import { PublicationStatus } from "@prisma/client";

import { PublicationExecutionResult, PublicationProviderInput } from "@/domain/types";

import { WordPressPublicationProvider } from "./wordpress-provider";
import { getWordPressConfig } from "./wordpress-config";
import { normalizePublicationTarget } from "./publication-targets";

export interface PublicationProvider {
  publish(input: PublicationProviderInput): Promise<PublicationExecutionResult>;
}

class MockPublicationProvider implements PublicationProvider {
  async publish(input: PublicationProviderInput): Promise<PublicationExecutionResult> {
    const normalizedTarget = normalizePublicationTarget(input.target);

    if (!normalizedTarget || normalizedTarget === "api-custom") {
      return {
        success: false,
        status: PublicationStatus.FAILED,
        errorMessage: normalizedTarget === "api-custom"
          ? "Le provider api-custom est prepare mais pas encore branche."
          : "Aucun adaptateur mock n'est disponible pour cette cible.",
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

  return new MockPublicationProvider();
}
