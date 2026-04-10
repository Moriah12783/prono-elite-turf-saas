export const PUBLICATION_TARGET_OPTIONS = ["mock", "wordpress-rest", "api-custom"] as const;

export type PublicationTargetKey = (typeof PUBLICATION_TARGET_OPTIONS)[number];

export function normalizePublicationTarget(target: string): PublicationTargetKey | null {
  const normalized = target.trim().toLowerCase();

  if (normalized === "mock") {
    return "mock";
  }

  if (normalized === "wordpress-rest" || normalized === "wordpress" || normalized === "wp") {
    return "wordpress-rest";
  }

  if (normalized === "api-custom" || normalized === "custom-api" || normalized === "api") {
    return "api-custom";
  }

  return null;
}
