// mobile-cleaner/src/offline/__tests__/outbox.test.ts
/**
 * M006/S03: Outbox unit tests
 * Uses in-memory AsyncStorage mock.
 */

// Mock AsyncStorage before importing anything
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
  enqueue,
  getQueue,
  removeItem,
  flush,
  clearQueue,
  getDeadLetter,
} from "../outbox";
import { OutboxItem } from "../types";

const PHOTO_ITEM: OutboxItem = {
  type: "photo",
  jobId: 1,
  photoType: "before",
  localUri: "file:///photo.jpg",
};

const CHECKLIST_ITEM: OutboxItem = {
  type: "checklist_bulk",
  jobId: 2,
  payload: [{ id: 1, is_completed: true }],
};

// Reset storage before each test
beforeEach(async () => {
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  jest.clearAllMocks();
});

describe("enqueue", () => {
  it("adds item to queue", async () => {
    await enqueue(PHOTO_ITEM);
    const queue = await getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].item).toEqual(PHOTO_ITEM);
  });

  it("returns a string ID", async () => {
    const id = await enqueue(PHOTO_ITEM);
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("uses provided ID", async () => {
    const id = await enqueue(PHOTO_ITEM, "custom-id-123");
    expect(id).toBe("custom-id-123");
    const queue = await getQueue();
    expect(queue[0].id).toBe("custom-id-123");
  });

  it("is idempotent for same ID", async () => {
    await enqueue(PHOTO_ITEM, "dup-id");
    await enqueue(CHECKLIST_ITEM, "dup-id"); // same ID, different item
    const queue = await getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].item).toEqual(PHOTO_ITEM); // first item preserved
  });

  it("sets retriesLeft to 3 by default", async () => {
    await enqueue(PHOTO_ITEM);
    const queue = await getQueue();
    expect(queue[0].retriesLeft).toBe(3);
  });

  it("sets enqueuedAt timestamp", async () => {
    const before = Date.now();
    await enqueue(PHOTO_ITEM);
    const after = Date.now();
    const queue = await getQueue();
    expect(queue[0].enqueuedAt).toBeGreaterThanOrEqual(before);
    expect(queue[0].enqueuedAt).toBeLessThanOrEqual(after);
  });
});

describe("removeItem", () => {
  it("removes item by ID", async () => {
    const id = await enqueue(PHOTO_ITEM);
    await removeItem(id);
    const queue = await getQueue();
    expect(queue).toHaveLength(0);
  });

  it("is a no-op for non-existent ID", async () => {
    await enqueue(PHOTO_ITEM);
    await removeItem("nonexistent");
    const queue = await getQueue();
    expect(queue).toHaveLength(1);
  });
});

describe("flush", () => {
  it("calls processItem for each queued item", async () => {
    await enqueue(PHOTO_ITEM);
    await enqueue(CHECKLIST_ITEM);
    const processor = jest.fn().mockResolvedValue(undefined);
    const result = await flush(processor);
    expect(processor).toHaveBeenCalledTimes(2);
    expect(result.processed).toBe(2);
    expect(result.failed).toBe(0);
  });

  it("removes processed items from queue", async () => {
    await enqueue(PHOTO_ITEM);
    await flush(jest.fn().mockResolvedValue(undefined));
    const queue = await getQueue();
    expect(queue).toHaveLength(0);
  });

  it("decrements retriesLeft on failure", async () => {
    await enqueue(PHOTO_ITEM);
    const failProcessor = jest.fn().mockRejectedValue(new Error("network"));
    await flush(failProcessor);
    const queue = await getQueue();
    expect(queue[0].retriesLeft).toBe(2);
  });

  it("removes item after retries exhausted", async () => {
    const id = await enqueue(PHOTO_ITEM);
    const failProcessor = jest.fn().mockRejectedValue(new Error("network"));
    // 3 flushes = 3 retries
    await flush(failProcessor);
    await flush(failProcessor);
    const result = await flush(failProcessor);
    expect(result.exhausted).toBe(1);
    const queue = await getQueue();
    expect(queue).toHaveLength(0);
  });

  it("moves exhausted items to dead letter", async () => {
    await enqueue(PHOTO_ITEM);
    const failProcessor = jest.fn().mockRejectedValue(new Error("x"));
    await flush(failProcessor);
    await flush(failProcessor);
    await flush(failProcessor);
    const dead = await getDeadLetter();
    expect(dead).toHaveLength(1);
    expect(dead[0].item).toEqual(PHOTO_ITEM);
  });

  it("returns zero counts for empty queue", async () => {
    const result = await flush(jest.fn());
    expect(result).toEqual({ processed: 0, failed: 0, exhausted: 0 });
  });

  it("processes items in order", async () => {
    const order: number[] = [];
    await enqueue({ ...PHOTO_ITEM, jobId: 1 });
    await enqueue({ ...PHOTO_ITEM, jobId: 2 });
    await flush(async (item) => { order.push((item as any).jobId); });
    expect(order).toEqual([1, 2]);
  });
});

describe("clearQueue", () => {
  it("removes all items", async () => {
    await enqueue(PHOTO_ITEM);
    await enqueue(CHECKLIST_ITEM);
    await clearQueue();
    const queue = await getQueue();
    expect(queue).toHaveLength(0);
  });
});
