export const SESSION_COOKIE_NAME = "prono_elite_turf_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 12;

export function getAuthSecret() {
  return process.env.AUTH_SECRET ?? "dev-auth-secret-change-me";
}

export function getSeedAdminConfig() {
  return {
    name: process.env.ADMIN_NAME ?? "Elite Turf Admin",
    email: process.env.ADMIN_EMAIL ?? "admin@elite-turf.local",
    password: process.env.ADMIN_PASSWORD ?? "ChangeMe123!"
  };
}
