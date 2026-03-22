// mobile-cleaner/src/offline/outbox.ts
/**
 * M006/S03: Persistent Offline Outbox
 *
 * Stores pending API operations in AsyncStorage so they survive app restart.
 * On reconnect (NetInfo), flush() processes the queue in order.
 *
 * Design:
 * - Items are identified by UUID
 * - Each item has a retriesLeft counter (default 3)
 * - flush() processes items sequentially; on success removes; on error decrements retries
 * - Items with retriesLeft == 0 are moved to a dead-letter list (not retried again)
 * - Idempotent: double-enqueueing the same id is a no-op
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { OutboxItem } from "./types";

const OUTBOX_KEY = "offline:outbox:v1";
const DEAD_LETTER_KEY = "offline:outbox:dead:v1";
const DEFAULT_RETRIES = 3;

export interface OutboxEntry {
  id: string;         // UUID
  item: OutboxItem;
  retriesLeft: number;
  enqueuedAt: number; // Date.now()
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

async function readQueue(): Promise<OutboxEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(OUTBOX_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OutboxEntry[];
  } catch {
    return [];
  }
}

async function writeQueue(entries: OutboxEntry[]): Promise<void> {
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(entries));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Add an item to the outbox. No-op if an entry with the same id already exists.
 */
export async function enqueue(item: OutboxItem, id?: string): Promise<string> {
  const entryId = id ?? generateId();
  const queue = await readQueue();

  // Idempotency: skip if already queued
  if (queue.some((e) => e.id === entryId)) {
    return entryId;
  }

  const entry: OutboxEntry = {
    id: entryId,
    item,
    retriesLeft: DEFAULT_RETRIES,
    enqueuedAt: Date.now(),
  };
  queue.push(entry);
  await writeQueue(queue);
  return entryId;
}

/**
 * Read the current outbox queue (read-only).
 */
export async function getQueue(): Promise<OutboxEntry[]> {
  return readQueue();
}

/**
 * Remove a specific item from the queue by id.
 */
export async function removeItem(id: string): Promise<void> {
  const queue = await readQueue();
  await writeQueue(queue.filter((e) => e.id !== id));
}

/**
 * Clear the entire outbox. Use with caution.
 */
export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(OUTBOX_KEY);
}

/**
 * Process the outbox queue using the provided flush function.
 *
 * @param processItem - async function that sends one item to the API
 * @returns { processed, failed, exhausted } counts
 */
export async function flush(
  processItem: (item: OutboxItem) => Promise<void>
): Promise<{ processed: number; failed: number; exhausted: number }> {
  const queue = await readQueue();
  if (queue.length === 0) return { processed: 0, failed: 0, exhausted: 0 };

  const remaining: OutboxEntry[] = [];
  const dead: OutboxEntry[] = [];
  let processed = 0;
  let failed = 0;
  let exhausted = 0;

  for (const entry of queue) {
    try {
      await processItem(entry.item);
      processed++;
      // Success: don't add to remaining (it's removed)
    } catch (err) {
      failed++;
      const newRetries = entry.retriesLeft - 1;
      if (newRetries <= 0) {
        exhausted++;
        dead.push({ ...entry, retriesLeft: 0 });
      } else {
        remaining.push({ ...entry, retriesLeft: newRetries });
      }
    }
  }

  await writeQueue(remaining);

  // Append exhausted items to dead letter storage
  if (dead.length > 0) {
    try {
      const raw = await AsyncStorage.getItem(DEAD_LETTER_KEY);
      const existing: OutboxEntry[] = raw ? JSON.parse(raw) : [];
      // Keep at most 50 dead-letter items
      const updated = [...existing, ...dead].slice(-50);
      await AsyncStorage.setItem(DEAD_LETTER_KEY, JSON.stringify(updated));
    } catch {
      // Dead letter storage failure is non-fatal
    }
  }

  return { processed, failed, exhausted };
}

/**
 * Get dead-letter items (exhausted retries).
 */
export async function getDeadLetter(): Promise<OutboxEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(DEAD_LETTER_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function generateId(): string {
  // RFC 4122 v4 UUID — simple implementation without external deps
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
