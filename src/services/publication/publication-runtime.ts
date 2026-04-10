import { getApiCustomConfig } from "./api-custom-config";
import { PublicationTargetKey } from "./publication-targets";
import { getWordPressConfig } from "./wordpress-config";

export function getPublicationTargetRuntimeMode(target: PublicationTargetKey): "mock" | "real" | "prepared" {
  if (target === "wordpress-rest") {
    return getWordPressConfig().enabled ? "real" : "mock";
  }

  if (target === "api-custom") {
    return getApiCustomConfig().enabled ? "real" : "prepared";
  }

  return "mock";
}
