const ALLOWED_WORDPRESS_STATUSES = new Set(["draft", "publish", "pending", "private"]);

export type WordPressConfig = {
  enabled: boolean;
  baseUrl: string;
  username: string;
  appPassword: string;
  postsEndpoint: string;
  defaultStatus: string;
  missingFields: string[];
};

function normalizeWordPressStatus(value: string | undefined): string {
  const normalized = value?.trim().toLowerCase() || "draft";
  return ALLOWED_WORDPRESS_STATUSES.has(normalized) ? normalized : "draft";
}

export function getWordPressConfig(): WordPressConfig {
  const baseUrl = process.env.WORDPRESS_BASE_URL?.trim() || "";
  const username = process.env.WORDPRESS_USERNAME?.trim() || "";
  const appPassword = process.env.WORDPRESS_APP_PASSWORD?.trim() || "";
  const postsEndpoint = process.env.WORDPRESS_POSTS_ENDPOINT?.trim() || "/wp-json/wp/v2/posts";
  const defaultStatus = normalizeWordPressStatus(process.env.WORDPRESS_DEFAULT_STATUS);

  const missingFields = [
    !baseUrl ? "WORDPRESS_BASE_URL" : null,
    !username ? "WORDPRESS_USERNAME" : null,
    !appPassword ? "WORDPRESS_APP_PASSWORD" : null
  ].filter((item): item is string => Boolean(item));

  return {
    enabled: missingFields.length === 0,
    baseUrl,
    username,
    appPassword,
    postsEndpoint,
    defaultStatus,
    missingFields
  };
}

export function isWordPressTarget(target: string): boolean {
  const normalizedTarget = target.trim().toLowerCase();
  return normalizedTarget.includes("wordpress") || normalizedTarget.includes("wp");
}
