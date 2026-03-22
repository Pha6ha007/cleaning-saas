// mobile-cleaner/src/offline/__tests__/jobCache.test.ts
/**
 * M006/S03: Job cache unit tests
 */

const mockStorage: Record<string, string> = {};

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async (key: string) => mockStorage[key] ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    mockStorage[key] = value;
  }),
  removeItem: jest.fn(async (key: string) => {
    delete mockStorage[key];
  }),
  getAllKeys: jest.fn(async () => Object.keys(mockStorage)),
  multiRemove: jest.fn(async (keys: string[]) => {
    keys.forEach((k) => delete mockStorage[k]);
  }),
}));

import {
  cacheJob,
  getCachedJob,
  cacheJobList,
  getCachedJobList,
  saveChecklistState,
  loadChecklistState,
  clearChecklistState,
  clearAllJobCaches,
  CachedJob,
  ChecklistItem,
} from "../jobCache";

const SAMPLE_JOB: CachedJob = {
  id: 42,
  status: "scheduled",
  location: { id: 1, name: "Test Location" },
  scheduled_date: "2026-06-01",
};

const SAMPLE_CHECKLIST: ChecklistItem[] = [
  { id: 1, text: "Mop floor", is_completed: false, is_required: true, order: 1 },
  { id: 2, text: "Empty bins", is_completed: true, is_required: true, order: 2 },
];

beforeEach(() => {
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  jest.clearAllMocks();
});

describe("cacheJob / getCachedJob", () => {
  it("stores and retrieves a job", async () => {
    await cacheJob(SAMPLE_JOB);
    const result = await getCachedJob(42);
    expect(result).toEqual(SAMPLE_JOB);
  });

  it("returns null for missing job", async () => {
    const result = await getCachedJob(999);
    expect(result).toBeNull();
  });

  it("returns null for expired job (>24h)", async () => {
    await cacheJob(SAMPLE_JOB);
    // Manipulate stored timestamp to simulate expiry
    const key = "jobcache:detail:42";
    const stored = JSON.parse(mockStorage[key]);
    stored.cachedAt = Date.now() - 25 * 60 * 60 * 1000; // 25h ago
    mockStorage[key] = JSON.stringify(stored);
    const result = await getCachedJob(42);
    expect(result).toBeNull();
  });

  it("overwrites existing cached job", async () => {
    await cacheJob(SAMPLE_JOB);
    await cacheJob({ ...SAMPLE_JOB, status: "in_progress" });
    const result = await getCachedJob(42);
    expect(result?.status).toBe("in_progress");
  });
});

describe("cacheJobList / getCachedJobList", () => {
  it("stores and retrieves job list", async () => {
    await cacheJobList([SAMPLE_JOB]);
    const result = await getCachedJobList();
    expect(result).toHaveLength(1);
    expect(result?.[0].id).toBe(42);
  });

  it("returns null when no list cached", async () => {
    expect(await getCachedJobList()).toBeNull();
  });
});

describe("saveChecklistState / loadChecklistState", () => {
  it("stores and loads checklist state", async () => {
    await saveChecklistState(42, SAMPLE_CHECKLIST);
    const result = await loadChecklistState(42);
    expect(result).not.toBeNull();
    expect(result?.items).toEqual(SAMPLE_CHECKLIST);
    expect(typeof result?.savedAt).toBe("number");
  });

  it("returns null for missing checklist", async () => {
    expect(await loadChecklistState(999)).toBeNull();
  });

  it("overwrites existing checklist state", async () => {
    await saveChecklistState(42, SAMPLE_CHECKLIST);
    const updated = [{ ...SAMPLE_CHECKLIST[0], is_completed: true }, SAMPLE_CHECKLIST[1]];
    await saveChecklistState(42, updated);
    const result = await loadChecklistState(42);
    expect(result?.items[0].is_completed).toBe(true);
  });
});

describe("clearChecklistState", () => {
  it("removes checklist for given job", async () => {
    await saveChecklistState(42, SAMPLE_CHECKLIST);
    await clearChecklistState(42);
    expect(await loadChecklistState(42)).toBeNull();
  });

  it("does not affect other jobs", async () => {
    await saveChecklistState(42, SAMPLE_CHECKLIST);
    await saveChecklistState(43, SAMPLE_CHECKLIST);
    await clearChecklistState(42);
    expect(await loadChecklistState(43)).not.toBeNull();
  });
});

describe("clearAllJobCaches", () => {
  it("removes all job cache entries", async () => {
    await cacheJob(SAMPLE_JOB);
    await cacheJobList([SAMPLE_JOB]);
    await saveChecklistState(42, SAMPLE_CHECKLIST);
    await clearAllJobCaches();
    expect(await getCachedJob(42)).toBeNull();
    expect(await getCachedJobList()).toBeNull();
    expect(await loadChecklistState(42)).toBeNull();
  });
});
