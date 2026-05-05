const DEV_API_BASE_URL = "http://127.0.0.1:8001";
const MISSING_API_BASE_URL_ERROR =
  "VITE_API_BASE_URL is required before making backend API requests outside development.";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function readConfiguredApiBaseUrl(): string | null {
  const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;

  if (raw && raw.trim()) {
    return trimTrailingSlash(raw.trim());
  }

  if (import.meta.env.DEV) {
    return DEV_API_BASE_URL;
  }

  return null;
}

/**
 * Import-time safe value for route shells and static pages.
 * May be empty in non-dev environments that intentionally render without backend access.
 */
export const API_BASE_URL = readConfiguredApiBaseUrl() ?? "";

/**
 * Call this at the actual request site when backend access is required.
 * This keeps static/public routes renderable while failing explicitly at API use time.
 */
export function requireApiBaseUrl(): string {
  if (API_BASE_URL) {
    return API_BASE_URL;
  }

  throw new Error(MISSING_API_BASE_URL_ERROR);
}

export const DEV_MANAGER_EMAIL = (import.meta.env.VITE_DEV_MANAGER_EMAIL as string | undefined)?.trim() || "";
export const DEV_MANAGER_PASSWORD = (import.meta.env.VITE_DEV_MANAGER_PASSWORD as string | undefined) || "";

export function hasDevManagerCredentials(): boolean {
  return Boolean(DEV_MANAGER_EMAIL && DEV_MANAGER_PASSWORD);
}
