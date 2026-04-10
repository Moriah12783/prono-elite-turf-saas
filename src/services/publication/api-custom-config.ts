const ALLOWED_CUSTOM_STATUSES = new Set(["draft", "publish", "pending", "private"]);

export type ApiCustomConfig = {
  enabled: boolean;
  baseUrl: string;
  token: string;
  endpoint: string;
  defaultStatus: string;
  missingFields: string[];
};

function normalizeCustomStatus(value: string | undefined): string {
  const normalized = value?.trim().toLowerCase() || "draft";
  return ALLOWED_CUSTOM_STATUSES.has(normalized) ? normalized : "draft";
}

export function getApiCustomConfig(): ApiCustomConfig {
  const baseUrl = process.env.API_CUSTOM_BASE_URL?.trim() || "";
  const token = process.env.API_CUSTOM_TOKEN?.trim() || "";
  const endpoint = process.env.API_CUSTOM_ENDPOINT?.trim() || "/publications";
  const defaultStatus = normalizeCustomStatus(process.env.API_CUSTOM_DEFAULT_STATUS);

  const missingFields = [
    !baseUrl ? "API_CUSTOM_BASE_URL" : null,
    !token ? "API_CUSTOM_TOKEN" : null
  ].filter((item): item is string => Boolean(item));

  return {
    enabled: missingFields.length === 0,
    baseUrl,
    token,
    endpoint,
    defaultStatus,
    missingFields
  };
}
