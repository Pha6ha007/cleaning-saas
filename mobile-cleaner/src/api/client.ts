// mobile-cleaner/src/api/client.ts
/**
 * Mobile API client — Execution Core (Layer 1)
 *
 * M003/S01: Migrated to JWT auth.
 *   - loginCleaner() now hits /api/auth/cleaner/jwt/login/ → returns access + refresh tokens
 *   - apiFetch() sends Authorization: Bearer <access>
 *   - 401 → auto-refresh via /api/manager/auth/jwt/refresh/ (shared endpoint)
 *   - Refresh fail → auto-logout (token cleared, resetToLogin())
 *   - _refreshPromise dedup: concurrent 401s share one refresh, not N
 *   - Backward compatible: old Token-auth sessions still handled (Token stored separately)
 *
 * ВАЖНО:
 * - Любое изменение формата payload'ов или URL может сломать:
 *   - backend-валидацию (Phase 9 photos, GPS, checklist),
 *   - Manager Portal (Job Details / Planning),
 *   - PDF-отчёты.
 * - Перед изменениями:
 *   - проверять backend/apps/api/*,
 *   - проверять контракты, описанные в MASTER BRIEF / PRD,
 *   - прогонять полный флоу: Login → Today Jobs → Job Details → Check-in → Photos → Checklist → Check-out → PDF.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { resetToLogin } from "../navigation";

// Базовый URL API
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://192.168.31.78:8000";

// ─── Storage keys ────────────────────────────────────────────────────────────

const STORAGE_ACCESS_TOKEN  = "@jwt_access_token";
const STORAGE_REFRESH_TOKEN = "@jwt_refresh_token";
/** Legacy key — kept for backward compat read on first launch after upgrade */
const STORAGE_LEGACY_TOKEN  = "@auth_token";

// ─── In-memory auth state ────────────────────────────────────────────────────

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
};

const auth: AuthState = {
  accessToken: null,
  refreshToken: null,
};

/** Dedup: only one refresh request in flight at a time across concurrent 401s */
let _refreshPromise: Promise<string | null> | null = null;

// ─── Token management ─────────────────────────────────────────────────────────

export function getAccessToken(): string | null {
  return auth.accessToken;
}

export function getRefreshToken(): string | null {
  return auth.refreshToken;
}

/** Store JWT pair in memory + AsyncStorage. */
export async function setTokens(access: string, refresh: string): Promise<void> {
  auth.accessToken = access;
  auth.refreshToken = refresh;
  await Promise.all([
    AsyncStorage.setItem(STORAGE_ACCESS_TOKEN, access),
    AsyncStorage.setItem(STORAGE_REFRESH_TOKEN, refresh),
  ]).catch((err) => {
    console.warn("[setTokens] AsyncStorage failed:", err);
  });
}

/** Clear all tokens (logout). */
export async function clearTokens(): Promise<void> {
  auth.accessToken = null;
  auth.refreshToken = null;
  _refreshPromise = null;
  await Promise.all([
    AsyncStorage.removeItem(STORAGE_ACCESS_TOKEN),
    AsyncStorage.removeItem(STORAGE_REFRESH_TOKEN),
    AsyncStorage.removeItem(STORAGE_LEGACY_TOKEN),
  ]).catch((err) => {
    console.warn("[clearTokens] AsyncStorage failed:", err);
  });
}

/**
 * loadStoredTokens — called once at app startup to hydrate in-memory state.
 * Handles migration: if only legacy Token is stored, treats it as access token
 * (backward compat for users upgrading from pre-M003 app version).
 */
export async function loadStoredTokens(): Promise<void> {
  try {
    const [access, refresh, legacy] = await Promise.all([
      AsyncStorage.getItem(STORAGE_ACCESS_TOKEN),
      AsyncStorage.getItem(STORAGE_REFRESH_TOKEN),
      AsyncStorage.getItem(STORAGE_LEGACY_TOKEN),
    ]);

    if (access) {
      auth.accessToken = access;
      auth.refreshToken = refresh ?? null;
    } else if (legacy) {
      // Pre-M003 session: load legacy token as access token.
      // Next 401 will trigger refresh (or logout if no refresh token).
      auth.accessToken = legacy;
      auth.refreshToken = null;
      if (__DEV__) console.log("[loadStoredTokens] Loaded legacy Token auth — will upgrade on next request");
    }
  } catch (err) {
    console.warn("[loadStoredTokens] AsyncStorage failed:", err);
  }
}

/**
 * Backward-compat aliases used by pre-M003 code paths (e.g. fetchJobReportPdf).
 */
export function getAuthToken(): string | null {
  return auth.accessToken;
}
export function setAuthToken(token: string | null): void {
  auth.accessToken = token;
  if (token) {
    AsyncStorage.setItem(STORAGE_ACCESS_TOKEN, token).catch(() => {});
  } else {
    clearTokens().catch(() => {});
  }
}
export async function loadStoredToken(): Promise<string | null> {
  await loadStoredTokens();
  return auth.accessToken;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type CleanerJobSummary = {
  id: number;
  status: "scheduled" | "in_progress" | "completed" | string;
  scheduled_date?: string | null;
  scheduled_start_time?: string | null;
  scheduled_end_time?: string | null;
  location__name?: string | null;
  location?: {
    name?: string;
    address?: string;
  } | null;
};

export type JobChecklistItem = {
  id: number;
  order: number;
  text: string;
  is_required: boolean;
  is_completed: boolean;
};

export type JobCheckEvent = {
  id: number;
  event_type: "check_in" | "check_out" | string;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  distance_m: number | null;
  user_name: string;
};

export type JobPhoto = {
  id?: number;
  photo_type: "before" | "after" | string;
  url?: string;
  file_url?: string;
  created_at: string;
};

export type JobDetail = {
  id: number;
  status: "scheduled" | "in_progress" | "completed" | string;
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
  location_name: string | null;
  manager_notes: string;
  cleaner_notes: string;
  checklist_items: JobChecklistItem[];
  check_events: JobCheckEvent[];
  before_photo_url: string | null;
  after_photo_url: string | null;
  location?: {
    name?: string | null;
    address?: string | null;
    latitude?: number | string | null;
    longitude?: number | string | null;
  } | null;
  location_address?: string | null;
  location_latitude?: number | string | null;
  location_lat?: number | string | null;
  location_longitude?: number | string | null;
  location_lng?: number | string | null;
};

export type JobListItem = CleanerJobSummary;

// ─── Error type ───────────────────────────────────────────────────────────────

type ApiError = Error & {
  status?: number;
  details?: any;
};

// ─── Token refresh ────────────────────────────────────────────────────────────

/**
 * Refresh the access token using the stored refresh token.
 * Uses module-level _refreshPromise to ensure only one in-flight refresh at a time.
 * Returns new access token string, or null if refresh failed (caller should logout).
 */
async function _doRefresh(): Promise<string | null> {
  const refresh = auth.refreshToken;
  if (!refresh) return null;

  try {
    const resp = await fetch(`${API_BASE_URL}/api/manager/auth/jwt/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });

    if (!resp.ok) return null;

    const data = await resp.json();
    const newAccess: string | null = data?.access ?? null;
    const newRefresh: string | null = data?.refresh ?? null;

    if (!newAccess) return null;

    // Store new pair
    auth.accessToken = newAccess;
    if (newRefresh) auth.refreshToken = newRefresh;
    await Promise.all([
      AsyncStorage.setItem(STORAGE_ACCESS_TOKEN, newAccess),
      newRefresh ? AsyncStorage.setItem(STORAGE_REFRESH_TOKEN, newRefresh) : Promise.resolve(),
    ]).catch(() => {});

    return newAccess;
  } catch {
    return null;
  }
}

function _refreshOnce(): Promise<string | null> {
  if (!_refreshPromise) {
    _refreshPromise = _doRefresh().finally(() => {
      _refreshPromise = null;
    });
  }
  return _refreshPromise;
}

// ─── Core fetch ───────────────────────────────────────────────────────────────

/**
 * apiFetch — единственный низкоуровневый helper для запросов.
 *
 * M003/S01 changes:
 * - Sends Authorization: Bearer <access> (JWT)
 * - Legacy Token auth fallback: if access token looks like a DRF Token (no dots), sends Token header
 * - On 401: attempts one silent token refresh, retries request
 * - On refresh failure: clears tokens, calls resetToLogin()
 *
 * НЕЛЬЗЯ:
 * - Ставить Content-Type руками для FormData (ломает boundary);
 * - менять формат выбрасываемых ошибок (ожидается Error с .status);
 * - читать body более одного раза.
 */

// TODO (offline groundwork):
// If a request fails due to network connectivity,
// certain actions (checklist updates, photo uploads)
// may be enqueued into an offline outbox instead of throwing.
// Check-in / check-out must never be queued.

async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
  _retried = false
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };

  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const token = auth.accessToken;
  if (token && !headers["Authorization"]) {
    // Detect legacy DRF Token (no dots) vs JWT (two dots = three parts)
    const isJwt = token.split(".").length === 3;
    headers["Authorization"] = isJwt ? `Bearer ${token}` : `Token ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  let resp: Response;
  try {
    resp = await fetch(url, { ...options, headers, signal: controller.signal });
  } catch (fetchErr: any) {
    const msg: string = fetchErr?.message ?? "";
    if (fetchErr?.name === "AbortError" || msg.includes("aborted")) {
      throw new Error("Request timed out. Please check your connection and try again.");
    }
    if (
      msg.includes("Network request failed") ||
      msg.includes("Failed to fetch") ||
      msg.includes("Network Error")
    ) {
      if (__DEV__) console.warn("[apiFetch] network error:", fetchErr);
      throw new Error("No internet connection. Please check your network and try again.");
    }
    throw fetchErr;
  } finally {
    clearTimeout(timeoutId);
  }

  // ─── 401: attempt silent refresh ──────────────────────────────────────────
  if (resp.status === 401 && !_retried) {
    const newAccess = await _refreshOnce();
    if (newAccess) {
      // Retry once with new token
      return apiFetch<T>(path, options, true);
    }
    // Refresh failed — logout
    await clearTokens();
    resetToLogin();
    const err: ApiError = new Error("Session expired. Please login again.");
    err.status = 401;
    throw err;
  }

  const raw = await resp.text();
  const contentType = resp.headers.get("content-type") || "";

  let data: any = null;
  if (raw) {
    if (contentType.includes("application/json")) {
      try { data = JSON.parse(raw); } catch { data = raw; }
    } else {
      data = raw;
    }
  }

  // 401 on retry (or no refresh token) → logout
  if (resp.status === 401) {
    await clearTokens();
    resetToLogin();
    const err: ApiError = new Error("Session expired. Please login again.");
    err.status = 401;
    throw err;
  }

  if (!resp.ok) {
    const msg =
      typeof data === "string"
        ? data
        : data?.detail || data?.message || (data ? JSON.stringify(data) : `HTTP ${resp.status}`);
    const err: ApiError = new Error(msg);
    err.status = resp.status;
    err.details = data;
    throw err;
  }

  return data as T;
}

// ─── Auth / login ─────────────────────────────────────────────────────────────

/**
 * loginCleaner
 *
 * M003/S01: POST /api/auth/cleaner/jwt/login/
 * Returns access + refresh JWT tokens.
 *
 * НЕЛЬЗЯ:
 * - менять URL без синхронизации с backend;
 * - менять формат ответа { access, refresh } — это ломает весь login-flow.
 */
export async function loginCleaner(email: string, password: string): Promise<void> {
  const data = await fetch(`${API_BASE_URL}/api/auth/cleaner/jwt/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!data.ok) {
    const body = await data.json().catch(() => ({}));
    throw new Error(body?.detail || "Login failed. Please check your credentials.");
  }

  const json = await data.json();

  if (!json?.access || !json?.refresh) {
    throw new Error("Login succeeded but tokens are missing in response");
  }

  await setTokens(json.access, json.refresh);
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export async function fetchCleanerTodayJobs(): Promise<CleanerJobSummary[]> {
  const data = await apiFetch<CleanerJobSummary[]>("/api/jobs/today/", { method: "GET" });
  return data ?? [];
}

export async function fetchTodayJobs(): Promise<JobListItem[]> {
  return fetchCleanerTodayJobs();
}

export async function fetchJobDetail(jobId: number): Promise<JobDetail> {
  return apiFetch<JobDetail>(`/api/jobs/${jobId}/`, { method: "GET" });
}

// ─── Check-in / Check-out ─────────────────────────────────────────────────────

export async function checkInJob(jobId: number, latitude: number, longitude: number): Promise<any> {
  const data = await apiFetch<any>(`/api/jobs/${jobId}/check-in/`, {
    method: "POST",
    body: JSON.stringify({ latitude, longitude }),
  });
  if (__DEV__) console.log("[checkInJob] response:", data);
  return data;
}

export async function checkOutJob(jobId: number, latitude: number, longitude: number): Promise<any> {
  const data = await apiFetch<any>(`/api/jobs/${jobId}/check-out/`, {
    method: "POST",
    body: JSON.stringify({ latitude, longitude }),
  });
  if (__DEV__) console.log("[checkOutJob] response:", data);
  return data;
}

// ─── Checklist ────────────────────────────────────────────────────────────────

export async function updateJobChecklistBulk(
  jobId: number,
  items: { id: number; is_completed: boolean }[]
): Promise<JobChecklistItem[]> {
  const data = await apiFetch<any>(`/api/jobs/${jobId}/checklist/bulk/`, {
    method: "POST",
    body: JSON.stringify({ items }),
  });
  if (__DEV__) console.log("[updateJobChecklistBulk] raw response:", data);
  const list = data?.items ?? data?.checklist_items ?? (Array.isArray(data) ? data : null);
  return Array.isArray(list) ? (list as JobChecklistItem[]) : [];
}

export async function toggleJobChecklistItem(
  jobId: number,
  itemId: number,
  isCompleted: boolean
): Promise<{ id: number; job_id: number; is_completed: boolean }> {
  const data = await apiFetch<{ id: number; job_id: number; is_completed: boolean }>(
    `/api/jobs/${jobId}/checklist/${itemId}/toggle/`,
    { method: "POST", body: JSON.stringify({ is_completed: isCompleted }) }
  );
  if (__DEV__) console.log("[toggleJobChecklistItem] response:", data);
  return data;
}

export async function toggleChecklistItem(
  jobId: number,
  itemId: number,
  isCompleted: boolean
): Promise<{ id: number; job_id: number; is_completed: boolean }> {
  return toggleJobChecklistItem(jobId, itemId, isCompleted);
}

// ─── Photos ───────────────────────────────────────────────────────────────────

export async function fetchJobPhotos(jobId: number): Promise<JobPhoto[]> {
  const data = await apiFetch<JobPhoto[]>(`/api/jobs/${jobId}/photos/`, { method: "GET" });
  return data ?? [];
}

export async function uploadJobPhoto(
  jobId: number,
  photoType: "before" | "after",
  uri: string
): Promise<any> {
  if (!uri) throw new Error("Internal error: photo URI is missing");

  const form = new FormData();
  form.append("photo_type", photoType);

  const name = uri.split("/").pop() || `${photoType}.jpg`;
  const ext = name.split(".").pop()?.toLowerCase();
  const type = ext === "png" ? "image/png" : ext === "heic" ? "image/heic" : "image/jpeg";

  form.append("file", { uri, name, type } as any);

  if (__DEV__) console.log("[uploadJobPhoto] sending form", { jobId, photoType, uri, name, type });

  const data = await apiFetch<any>(`/api/jobs/${jobId}/photos/`, { method: "POST", body: form });
  if (__DEV__) console.log("[uploadJobPhoto] response:", data);
  return data;
}

// ─── PDF report ───────────────────────────────────────────────────────────────

export async function fetchJobReportPdf(jobId: number): Promise<ArrayBuffer> {
  const url = `${API_BASE_URL}/api/jobs/${jobId}/report/pdf/`;

  const token = auth.accessToken;
  const headers: Record<string, string> = {};
  if (token) {
    const isJwt = token.split(".").length === 3;
    headers["Authorization"] = isJwt ? `Bearer ${token}` : `Token ${token}`;
  }

  const resp = await fetch(url, { method: "POST", headers });

  if (!resp.ok) {
    const raw = await resp.text().catch(() => "");
    throw new Error(raw || `Failed to fetch PDF report (HTTP ${resp.status})`);
  }

  return await resp.arrayBuffer();
}
