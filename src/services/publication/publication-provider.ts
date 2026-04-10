import { PublicationStatus } from "@prisma/client";

import { PublicationExecutionResult, PublicationProviderInput } from "@/domain/types";

import { WordPressPublicationProvider } from "./wordpress-provider";
import { getWordPressConfig, isWordPressTarget } from "./wordpress-config";

export interface PublicationProvider {
  publish(input: PublicationProviderInput): Promise<PublicationExecutionResult>;
}

class MockPublicationProvider implements PublicationProvider {
  async publish(input: PublicationProviderInput): Promise<PublicationExecutionResult> {
    const normalizedTarget = input.target.toLowerCase();

    if (!normalizedTarget.includes("wordpress") && !normalizedTarget.includes("api") && !normalizedTarget.includes("cms")) {
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
  if (isWordPressTarget(target)) {
    const config = getWordPressConfig();

    if (config.enabled) {
      return new WordPressPublicationProvider();
    }
  }

  return new MockPublicationProvider();
}
