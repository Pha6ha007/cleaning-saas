// dubai-control/src/hooks/useOfflinePhotos.ts
/**
 * Hook for offline photo management
 * V3 PWA Enhancement - Phase 1: Offline Photo Capture
 */

import { useState, useEffect, useCallback } from "react";
import {
  saveOfflinePhoto,
  getPhotosByVisitId,
  deletePhoto,
  updatePhotoStatus,
  addToSyncQueue,
  type OfflinePhoto,
  type SyncQueueItem,
} from "../lib/indexedDB";
import { useOnlineStatus } from "./useOnlineStatus";
import { compressImage, getFileSizeMB, isImageFile } from "../lib/imageCompression";

// Generate UUID using crypto API
function generateUUID(): string {
  return crypto.randomUUID();
}

export function useOfflinePhotos(visitId: number) {
  const [photos, setPhotos] = useState<OfflinePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isOnline = useOnlineStatus();

  // Load photos from IndexedDB
  const loadPhotos = useCallback(async () => {
    // Validate visitId before querying IndexedDB
    if (!visitId || typeof visitId !== 'number' || isNaN(visitId)) {
      console.warn('[useOfflinePhotos] Invalid visitId, skipping load:', visitId);
      setPhotos([]);
      setError(null); // Not an error, just no valid visit yet
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const storedPhotos = await getPhotosByVisitId(visitId);
      setPhotos(storedPhotos);
      setError(null);
    } catch (err) {
      console.error("Failed to load offline photos:", err);
      setError("Failed to load offline photos");
    } finally {
      setLoading(false);
    }
  }, [visitId]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  /**
   * Capture a photo and save it offline
   * V3 Phase 1.5: Now includes automatic image compression
   */
  const capturePhoto = useCallback(
    async (
      file: File,
      photoType: "before" | "after"
    ): Promise<OfflinePhoto> => {
      try {
        // Validate visitId
        if (!visitId || typeof visitId !== 'number' || isNaN(visitId)) {
          throw new Error("Invalid visit ID - cannot save photo");
        }

        // Validate that it's an image file
        if (!isImageFile(file)) {
          throw new Error("File must be an image");
        }

        const originalSizeMB = getFileSizeMB(file);

        // Compress image if needed (target: < 8MB)
        let processedFile = file;
        if (originalSizeMB > 8) {
          try {
            processedFile = await compressImage(file, {
              maxSizeMB: 8,
              maxWidthOrHeight: 1920,
              quality: 0.85,
            });
            const compressedSizeMB = getFileSizeMB(processedFile);
          } catch (compressionError) {
            console.error("Failed to compress image:", compressionError);
            // Continue with original file if compression fails
            console.warn("Using original file (compression failed)");
          }
        }

        const photo: OfflinePhoto = {
          id: generateUUID(),
          visitId,
          photoType,
          blob: processedFile,
          fileName: processedFile.name,
          mimeType: processedFile.type,
          size: processedFile.size,
          capturedAt: new Date().toISOString(),
          status: isOnline ? "pending" : "pending",
          uploadAttempts: 0,
        };

        await saveOfflinePhoto(photo);

        // Add to sync queue
        const syncItem: SyncQueueItem = {
          id: generateUUID(),
          type: "photo-upload",
          visitId,
          photoId: photo.id,
          createdAt: new Date().toISOString(),
          status: "pending",
          attempts: 0,
        };
        await addToSyncQueue(syncItem);

        // Refresh photos list
        await loadPhotos();

        return photo;
      } catch (err) {
        console.error("Failed to capture photo:", err);
        throw new Error(err instanceof Error ? err.message : "Failed to save photo offline");
      }
    },
    [visitId, isOnline, loadPhotos]
  );

  /**
   * Delete a photo from offline storage
   */
  const removePhoto = useCallback(
    async (photoId: string) => {
      try {
        await deletePhoto(photoId);
        await loadPhotos();
      } catch (err) {
        console.error("Failed to delete photo:", err);
        throw new Error("Failed to delete photo");
      }
    },
    [loadPhotos]
  );

  /**
   * Mark photo as uploaded (called after successful sync)
   */
  const markAsUploaded = useCallback(
    async (photoId: string) => {
      try {
        await updatePhotoStatus(photoId, "uploaded");
        await loadPhotos();
      } catch (err) {
        console.error("Failed to mark photo as uploaded:", err);
      }
    },
    [loadPhotos]
  );

  /**
   * Mark photo as failed
   */
  const markAsFailed = useCallback(
    async (photoId: string, errorMsg: string) => {
      try {
        await updatePhotoStatus(photoId, "failed", errorMsg);
        await loadPhotos();
      } catch (err) {
        console.error("Failed to mark photo as failed:", err);
      }
    },
    [loadPhotos]
  );

  /**
   * Get before/after photo status
   */
  const getPhotoByType = useCallback(
    (type: "before" | "after"): OfflinePhoto | undefined => {
      return photos.find((p) => p.photoType === type);
    },
    [photos]
  );

  /**
   * Check if a photo type exists
   */
  const hasPhoto = useCallback(
    (type: "before" | "after"): boolean => {
      return photos.some((p) => p.photoType === type);
    },
    [photos]
  );

  /**
   * Get pending upload count
   */
  const pendingCount = photos.filter(
    (p) => p.status === "pending" || p.status === "uploading"
  ).length;

  return {
    photos,
    loading,
    error,
    capturePhoto,
    removePhoto,
    markAsUploaded,
    markAsFailed,
    getPhotoByType,
    hasPhoto,
    pendingCount,
    refresh: loadPhotos,
  };
}
