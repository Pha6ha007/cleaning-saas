const DEV_API_BASE_URL = "http://127.0.0.1:8001";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;

  if (raw && raw.trim()) {
    return trimTrailingSlash(raw.trim());
  }

  if (import.meta.env.DEV) {
    return DEV_API_BASE_URL;
  }

  throw new Error(
    "VITE_API_BASE_URL is required for production builds. Add it to your environment before building.",
  );
}

export const API_BASE_URL = getApiBaseUrl();

export const DEV_MANAGER_EMAIL = (import.meta.env.VITE_DEV_MANAGER_EMAIL as string | undefined)?.trim() || "";
export const DEV_MANAGER_PASSWORD = (import.meta.env.VITE_DEV_MANAGER_PASSWORD as string | undefined) || "";

export function hasDevManagerCredentials(): boolean {
  return Boolean(DEV_MANAGER_EMAIL && DEV_MANAGER_PASSWORD);
}
