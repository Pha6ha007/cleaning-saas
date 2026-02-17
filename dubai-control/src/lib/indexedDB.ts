// dubai-control/src/lib/indexedDB.ts
/**
 * IndexedDB wrapper for offline photo storage
 * V3 PWA Enhancement - Phase 1: Offline Photo Capture
 */

const DB_NAME = "maintainproof-offline";
const DB_VERSION = 1;

// Object store names
export const STORES = {
  PHOTOS: "photos",
  SYNC_QUEUE: "syncQueue",
} as const;

export interface OfflinePhoto {
  id: string; // UUID
  visitId: number;
  photoType: "before" | "after";
  blob: Blob;
  fileName: string;
  mimeType: string;
  size: number;
  capturedAt: string; // ISO timestamp
  status: "pending" | "uploading" | "uploaded" | "failed";
  uploadAttempts: number;
  lastError?: string;
}

export interface SyncQueueItem {
  id: string; // UUID
  type: "photo-upload";
  visitId: number;
  photoId: string;
  createdAt: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  attempts: number;
  lastAttempt?: string;
  lastError?: string;
}

/**
 * Open or create the IndexedDB database
 */
export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error("Failed to open IndexedDB"));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create photos store
      if (!db.objectStoreNames.contains(STORES.PHOTOS)) {
        const photosStore = db.createObjectStore(STORES.PHOTOS, {
          keyPath: "id",
        });
        photosStore.createIndex("visitId", "visitId", { unique: false });
        photosStore.createIndex("status", "status", { unique: false });
        photosStore.createIndex("capturedAt", "capturedAt", { unique: false });
      }

      // Create sync queue store
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const queueStore = db.createObjectStore(STORES.SYNC_QUEUE, {
          keyPath: "id",
        });
        queueStore.createIndex("status", "status", { unique: false });
        queueStore.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
  });
}

/**
 * Save a photo to IndexedDB
 */
export async function saveOfflinePhoto(
  photo: OfflinePhoto
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PHOTOS], "readwrite");
    const store = transaction.objectStore(STORES.PHOTOS);
    const request = store.put(photo);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error("Failed to save photo"));
  });
}

/**
 * Get all photos for a visit
 */
export async function getPhotosByVisitId(
  visitId: number
): Promise<OfflinePhoto[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PHOTOS], "readonly");
    const store = transaction.objectStore(STORES.PHOTOS);
    const index = store.index("visitId");
    const request = index.getAll(visitId);

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(new Error("Failed to get photos"));
  });
}

/**
 * Get a single photo by ID
 */
export async function getPhotoById(id: string): Promise<OfflinePhoto | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PHOTOS], "readonly");
    const store = transaction.objectStore(STORES.PHOTOS);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(new Error("Failed to get photo"));
  });
}

/**
 * Get all pending photos (status = pending or failed)
 */
export async function getPendingPhotos(): Promise<OfflinePhoto[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PHOTOS], "readonly");
    const store = transaction.objectStore(STORES.PHOTOS);
    const index = store.index("status");
    const request = store.getAll();

    request.onsuccess = () => {
      const allPhotos = request.result || [];
      const pending = allPhotos.filter(
        (p) => p.status === "pending" || p.status === "failed"
      );
      resolve(pending);
    };
    request.onerror = () => reject(new Error("Failed to get pending photos"));
  });
}

/**
 * Update photo status
 */
export async function updatePhotoStatus(
  id: string,
  status: OfflinePhoto["status"],
  error?: string
): Promise<void> {
  const photo = await getPhotoById(id);
  if (!photo) throw new Error("Photo not found");

  photo.status = status;
  photo.uploadAttempts += 1;
  if (error) {
    photo.lastError = error;
  }

  await saveOfflinePhoto(photo);
}

/**
 * Delete a photo from IndexedDB
 */
export async function deletePhoto(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PHOTOS], "readwrite");
    const store = transaction.objectStore(STORES.PHOTOS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error("Failed to delete photo"));
  });
}

/**
 * Add item to sync queue
 */
export async function addToSyncQueue(item: SyncQueueItem): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SYNC_QUEUE], "readwrite");
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    const request = store.put(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error("Failed to add to sync queue"));
  });
}

/**
 * Get all pending sync items
 */
export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SYNC_QUEUE], "readonly");
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    const request = store.getAll();

    request.onsuccess = () => {
      const allItems = request.result || [];
      const pending = allItems.filter(
        (item) => item.status === "pending" || item.status === "failed"
      );
      resolve(pending);
    };
    request.onerror = () =>
      reject(new Error("Failed to get pending sync items"));
  });
}

/**
 * Update sync queue item status
 */
export async function updateSyncItemStatus(
  id: string,
  status: SyncQueueItem["status"],
  error?: string
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SYNC_QUEUE], "readwrite");
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const item = getRequest.result;
      if (!item) {
        reject(new Error("Sync item not found"));
        return;
      }

      item.status = status;
      item.attempts += 1;
      item.lastAttempt = new Date().toISOString();
      if (error) {
        item.lastError = error;
      }

      const putRequest = store.put(item);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () =>
        reject(new Error("Failed to update sync item"));
    };

    getRequest.onerror = () =>
      reject(new Error("Failed to get sync item"));
  });
}

/**
 * Delete sync queue item
 */
export async function deleteSyncItem(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SYNC_QUEUE], "readwrite");
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error("Failed to delete sync item"));
  });
}

/**
 * Get database size estimate (if supported by browser)
 */
export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
  percentage: number;
} | null> {
  if (!navigator.storage || !navigator.storage.estimate) {
    return null;
  }

  const estimate = await navigator.storage.estimate();
  const usage = estimate.usage || 0;
  const quota = estimate.quota || 0;
  const percentage = quota > 0 ? (usage / quota) * 100 : 0;

  return {
    usage,
    quota,
    percentage,
  };
}

/**
 * Clear all offline data (for testing or reset)
 */
export async function clearAllOfflineData(): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [STORES.PHOTOS, STORES.SYNC_QUEUE],
      "readwrite"
    );

    transaction.objectStore(STORES.PHOTOS).clear();
    transaction.objectStore(STORES.SYNC_QUEUE).clear();

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error("Failed to clear data"));
  });
}
