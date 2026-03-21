// dubai-control/src/api/core.ts
// Shared API infrastructure — auth state, token management, fetch helpers
// Split from client.ts for maintainability

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001";

export type AuthState = {
  token: string | null;
};

export const auth: AuthState = {
  token: null,
};

// JWT localStorage key constants
export const STORAGE_KEYS = {
  ACCESS: "access_token",
  REFRESH: "refresh_token",
  // Legacy keys kept for backward compatibility during transition
  AUTH_TOKEN: "authToken",
  AUTH_TOKEN_ALT: "auth_token",
} as const;

// Deduplicates concurrent refresh calls — only one refresh fires at a time
export let _refreshPromise: Promise<void> | null = null;

// хелпер: подтянуть токен из localStorage
// Prefers JWT access_token; falls back to legacy Token for existing sessions
export function syncTokenFromStorage(): string | null {
  if (typeof window === "undefined") {
    return auth.token;
  }

  // Prefer JWT access token
  const jwtAccess = localStorage.getItem(STORAGE_KEYS.ACCESS);
  if (jwtAccess) {
    if (jwtAccess !== auth.token) {
      auth.token = jwtAccess;
    }
    return auth.token;
  }

  // Fall back to legacy Token auth (existing sessions, mobile compatibility)
  const legacyToken =
    localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) ||
    localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN_ALT);

  if (legacyToken && legacyToken !== auth.token) {
    auth.token = legacyToken;
  }

  return auth.token;
}

// Clear all auth state and redirect to login
export function _clearAuthAndRedirect(): void {
  auth.token = null;
  if (typeof window !== "undefined") {
    [
      STORAGE_KEYS.ACCESS,
      STORAGE_KEYS.REFRESH,
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.AUTH_TOKEN_ALT,
      "authUserRole",
      "authUserEmail",
    ].forEach((k) => localStorage.removeItem(k));
    console.warn("[auth] Session expired — redirecting to login");
    window.location.href = "/login";
  }
}

// Refresh JWT tokens. Deduplicates concurrent calls via _refreshPromise.
export async function _refreshTokens(): Promise<void> {
  if (_refreshPromise) {
    return _refreshPromise;
  }

  _refreshPromise = (async () => {
    const refreshToken =
      typeof window !== "undefined"
        ? localStorage.getItem(STORAGE_KEYS.REFRESH)
        : null;

    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const resp = await fetch(`${API_BASE_URL}/api/manager/auth/jwt/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!resp.ok) {
      throw new Error(`Refresh failed: ${resp.status}`);
    }

    const data = await resp.json();
    auth.token = data.access;

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.ACCESS, data.access);
      if (data.refresh) {
        localStorage.setItem(STORAGE_KEYS.REFRESH, data.refresh);
      }
    }

    console.warn("[auth] Token refreshed successfully");
  })().finally(() => {
    _refreshPromise = null;
  });

  return _refreshPromise;
}

// ---------- Low-level fetch helpers ----------

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  _retried = false
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  // Sync token before every request
  const currentToken = syncTokenFromStorage();

  if (currentToken && !("Authorization" in headers)) {
    headers["Authorization"] = `Bearer ${currentToken}`;
  }

  const resp = await fetch(url, {
    ...options,
    headers,
  });

  // 401: attempt silent token refresh and retry once
  if (resp.status === 401 && !_retried) {
    try {
      await _refreshTokens();
    } catch {
      console.error("[auth] refresh failed, redirecting to login");
      _clearAuthAndRedirect();
      throw new Error("Session expired");
    }
    return apiFetch<T>(path, options, true);
  }

  if (!resp.ok) {
    const text = await resp.text();

    let data: any;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { detail: text || "Unknown error" };
    }

    console.error("API error", resp.status, resp.statusText, data);

    const error: any = new Error("API request failed");
    error.response = {
      status: resp.status,
      statusText: resp.statusText,
      data,
    };
    throw error;
  }

  if (resp.status === 204) {
    return null as unknown as T;
  }

  return (await resp.json()) as T;
}

// Для бинарных (PDF) ответов — отдельный helper
export async function apiFetchBlob(
  path: string,
  options: RequestInit = {}
): Promise<Blob> {
  const url = `${API_BASE_URL}${path}`;

  const headers: HeadersInit = {
    ...(options.headers || {}),
  };

  const currentToken = syncTokenFromStorage();

  if (currentToken && !("Authorization" in headers)) {
    headers["Authorization"] = `Bearer ${currentToken}`;
  }

  const resp = await fetch(url, {
    ...options,
    headers,
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error("API blob error", resp.status, resp.statusText, text);
    throw new Error(
      `API ${resp.status} ${resp.statusText}: ${text || "Unknown error"}`
    );
  }

  return await resp.blob();
}

// ---------- Auth ----------
