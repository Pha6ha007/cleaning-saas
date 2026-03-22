// mobile-cleaner/src/offline/jobCache.ts
/**
 * M006/S03: Job Detail & Checklist Cache
 *
 * Persists job data and checklist state to AsyncStorage so the app
 * works when offline. TTL: 24h for job detail, no TTL for checklist
 * (persists until explicitly synced/cleared).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const JOB_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const JOB_DETAIL_PREFIX = "jobcache:detail:";
const JOB_LIST_KEY = "jobcache:list:v1";
const CHECKLIST_PREFIX = "jobcache:checklist:";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CachedJob {
  id: number;
  status: string;
  location?: { id: number; name: string };
  cleaner?: { id: number; full_name: string };
  scheduled_date?: string;
  [key: string]: unknown;
}

export interface ChecklistItem {
  id: number;
  text: string;
  is_completed: boolean;
  is_required: boolean;
  order: number;
}

interface CacheEnvelope<T> {
  value: T;
  cachedAt: number;
}

// ---------------------------------------------------------------------------
// Job Detail Cache
// ---------------------------------------------------------------------------

/**
 * Store a job's detail object. TTL: 24h.
 */
export async function cacheJob(job: CachedJob): Promise<void> {
  const envelope: CacheEnvelope<CachedJob> = {
    value: job,
    cachedAt: Date.now(),
  };
  await AsyncStorage.setItem(
    `${JOB_DETAIL_PREFIX}${job.id}`,
    JSON.stringify(envelope)
  );
}

/**
 * Retrieve a cached job. Returns null if missing or expired.
 */
export async function getCachedJob(id: number): Promise<CachedJob | null> {
  try {
    const raw = await AsyncStorage.getItem(`${JOB_DETAIL_PREFIX}${id}`);
    if (!raw) return null;
    const envelope: CacheEnvelope<CachedJob> = JSON.parse(raw);
    if (Date.now() - envelope.cachedAt > JOB_CACHE_TTL_MS) {
      await AsyncStorage.removeItem(`${JOB_DETAIL_PREFIX}${id}`);
      return null;
    }
    return envelope.value;
  } catch {
    return null;
  }
}

/**
 * Store the full list of today's jobs.
 */
export async function cacheJobList(jobs: CachedJob[]): Promise<void> {
  const envelope: CacheEnvelope<CachedJob[]> = {
    value: jobs,
    cachedAt: Date.now(),
  };
  await AsyncStorage.setItem(JOB_LIST_KEY, JSON.stringify(envelope));
}

/**
 * Retrieve cached job list. Returns null if missing or expired.
 */
export async function getCachedJobList(): Promise<CachedJob[] | null> {
  try {
    const raw = await AsyncStorage.getItem(JOB_LIST_KEY);
    if (!raw) return null;
    const envelope: CacheEnvelope<CachedJob[]> = JSON.parse(raw);
    if (Date.now() - envelope.cachedAt > JOB_CACHE_TTL_MS) {
      await AsyncStorage.removeItem(JOB_LIST_KEY);
      return null;
    }
    return envelope.value;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Checklist State (no TTL — persists until synced)
// ---------------------------------------------------------------------------

/**
 * Persist the full checklist state for a job.
 * Overwrites any existing saved state.
 */
export async function saveChecklistState(
  jobId: number,
  items: ChecklistItem[]
): Promise<void> {
  await AsyncStorage.setItem(
    `${CHECKLIST_PREFIX}${jobId}`,
    JSON.stringify({ items, savedAt: Date.now() })
  );
}

/**
 * Load persisted checklist state for a job. Returns null if not found.
 */
export async function loadChecklistState(
  jobId: number
): Promise<{ items: ChecklistItem[]; savedAt: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(`${CHECKLIST_PREFIX}${jobId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Clear checklist state for a job (call after successful sync).
 */
export async function clearChecklistState(jobId: number): Promise<void> {
  await AsyncStorage.removeItem(`${CHECKLIST_PREFIX}${jobId}`);
}

/**
 * Clear all job caches (use on logout).
 */
export async function clearAllJobCaches(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const jobKeys = keys.filter(
    (k) =>
      k.startsWith(JOB_DETAIL_PREFIX) ||
      k.startsWith(CHECKLIST_PREFIX) ||
      k === JOB_LIST_KEY
  );
  if (jobKeys.length > 0) {
    await AsyncStorage.multiRemove(jobKeys);
  }
}
