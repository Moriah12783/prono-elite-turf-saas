import { PublicationStatus } from "@prisma/client";

import { PublicationExecutionResult, PublicationProviderInput } from "@/domain/types";

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
        externalReference: undefined
      };
    }

    return {
      success: true,
      status: PublicationStatus.PUBLISHED,
      publishedAt: new Date(),
      externalReference: `mock-${input.publicationJobId}`
    };
  }
}

export function resolvePublicationProvider(target: string): PublicationProvider {
  void target;
  return new MockPublicationProvider();
}
