// dubai-control/src/hooks/usePhotoSync.ts
/**
 * Background sync hook for photo uploads
 * V3 PWA Enhancement - Phase 1: Offline Photo Capture
 */

import { useEffect, useRef, useCallback } from "react";
import { useOnlineStatus } from "./useOnlineStatus";
import {
  getPendingPhotos,
  getPhotoById,
  updatePhotoStatus,
  deletePhoto,
  deleteSyncItem,
  getPendingSyncItems,
} from "../lib/indexedDB";
import { uploadVisitPhoto, getVisitPhotos } from "../api/client";

const RETRY_DELAY_MS = 5000; // 5 seconds
const MAX_RETRIES = 3;

interface UsePhotoSyncOptions {
  onPhotoUploaded?: (visitId: number, photoType: "before" | "after") => void;
}

export function usePhotoSync(options?: UsePhotoSyncOptions) {
  const isOnline = useOnlineStatus();
  const syncInProgressRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { onPhotoUploaded } = options || {};

  /**
   * Sync a single photo
   */
  const syncPhoto = useCallback(async (photoId: string): Promise<boolean> => {
    try {
      const photo = await getPhotoById(photoId);
      if (!photo) {
        console.warn(`Photo ${photoId} not found in IndexedDB (orphaned sync item, will be cleaned up)`);
        // Return true to signal that sync item should be removed from queue
        return true;
      }

      // Skip if already uploaded
      if (photo.status === "uploaded") {
        return true;
      }

      // Skip if max retries exceeded - delete from IndexedDB to avoid hanging
      if (photo.uploadAttempts >= MAX_RETRIES) {
        console.warn(`Photo ${photoId} exceeded max retries, deleting from IndexedDB`);
        await updatePhotoStatus(photoId, "failed", "Max retries exceeded");
        // Auto-delete after max retries to avoid UI clutter
        await deletePhoto(photoId);
        return false;
      }

      // Check if photo already exists on server before attempting upload
      try {
        const existingPhotos = await getVisitPhotos(photo.visitId);
        const photoExists = existingPhotos.some(
          (p) => p.photo_type === photo.photoType
        );

        if (photoExists) {
          console.log(
            `Photo ${photoId} already exists on server (type: ${photo.photoType}), marking as uploaded`
          );
          await updatePhotoStatus(photoId, "uploaded");

          // Notify about photo (even if it already existed)
          if (onPhotoUploaded) {
            onPhotoUploaded(photo.visitId, photo.photoType);
          }

          await deletePhoto(photoId);
          return true;
        }
      } catch (checkError) {
        // If check fails, continue with upload attempt
        console.warn(`Failed to check existing photos for visit ${photo.visitId}:`, checkError);
      }

      // Mark as uploading
      await updatePhotoStatus(photoId, "uploading");

      // Create File from blob
      const file = new File([photo.blob], photo.fileName, {
        type: photo.mimeType,
      });

      // Upload to backend
      await uploadVisitPhoto(photo.visitId, {
        photo_type: photo.photoType,
        file,
      });

      // Mark as uploaded
      await updatePhotoStatus(photoId, "uploaded");

      // Notify about successful upload BEFORE deleting
      if (onPhotoUploaded) {
        onPhotoUploaded(photo.visitId, photo.photoType);
      }

      // Delete from IndexedDB (no longer needed)
      await deletePhoto(photoId);

      console.log(`[usePhotoSync] Photo uploaded successfully: ${photoId}`);
      return true;
    } catch (error) {
      console.error(`[usePhotoSync] Failed to sync photo ${photoId}:`, error);

      // Handle 409 Conflict (photo already exists) as success
      if (error instanceof Error && error.message.includes("already exists")) {
        console.log(`Photo ${photoId} already exists on server, marking as uploaded`);
        const photo = await getPhotoById(photoId);
        await updatePhotoStatus(photoId, "uploaded");

        // Notify about photo (even if it already existed)
        if (photo && onPhotoUploaded) {
          onPhotoUploaded(photo.visitId, photo.photoType);
        }

        await deletePhoto(photoId);
        return true;
      }

      // Handle 413 Request Too Large with clear message
      if (error instanceof Error && error.message.includes("request_too_large")) {
        const errorMessage = "Photo too large. Please try compressing the image.";
        await updatePhotoStatus(photoId, "failed", errorMessage);
        return false;
      }

      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await updatePhotoStatus(photoId, "failed", errorMessage);
      return false;
    }
  }, []);

  /**
   * Sync all pending photos
   */
  const syncAllPhotos = useCallback(async () => {
    if (syncInProgressRef.current || !isOnline) {
      return;
    }

    syncInProgressRef.current = true;

    try {
      // Clean up old failed photos and retry those that haven't exceeded max retries
      let allPhotos = await getPendingPhotos();
      for (const photo of allPhotos) {
        if (photo.status === "failed") {
          if (photo.uploadAttempts >= MAX_RETRIES) {
            // Delete photos that exceeded max retries
            console.log(`[usePhotoSync] Cleaning up old failed photo ${photo.id} (max retries exceeded)`);
            await deletePhoto(photo.id);
          } else {
            // Retry failed photos automatically by resetting to pending
            console.log(`[usePhotoSync] Retrying failed photo ${photo.id} (attempt ${photo.uploadAttempts + 1}/${MAX_RETRIES})`);
            await updatePhotoStatus(photo.id, "pending");
            // Photo will be picked up in the next sync cycle
          }
        }
      }

      // Refresh photos list after cleanup/retry
      allPhotos = await getPendingPhotos();

      // Filter photos: only sync those older than 2 seconds
      // This gives user time to see the new photo before it uploads
      const now = Date.now();
      const MIN_AGE_SECONDS = 2;

      const photosReadyToSync = allPhotos.filter(photo => {
        if (photo.status === "failed") return false; // Skip any remaining failed photos

        const capturedTime = new Date(photo.capturedAt).getTime();
        const ageSeconds = (now - capturedTime) / 1000;

        if (ageSeconds < MIN_AGE_SECONDS) {
          console.log(`[usePhotoSync] Skipping photo ${photo.id} - too new (${ageSeconds.toFixed(1)}s old)`);
          return false;
        }

        return true;
      });

      console.log(`[usePhotoSync] Photos ready to sync: ${photosReadyToSync.length} / ${allPhotos.length}`);

      // Get all pending sync items (refresh after cleanup/retry)
      const syncItems = await getPendingSyncItems();

      if (syncItems.length === 0) {
        console.log(`[usePhotoSync] No photos to sync`);
        return;
      }

      console.log(`[usePhotoSync] Starting sync for ${syncItems.length} photos`);

      // Clean up orphaned sync items (photos that no longer exist)
      const allPhotoIds = new Set(allPhotos.map(p => p.id));
      const readyPhotoIds = new Set(photosReadyToSync.map(p => p.id));

      for (const item of syncItems) {
        if (!allPhotoIds.has(item.photoId)) {
          console.log(`Removing orphaned sync item for photo ${item.photoId}`);
          await deleteSyncItem(item.id);
        }
      }

      // Sync each photo (only ready ones)
      for (const item of syncItems) {
        // Skip if photo doesn't exist
        if (!allPhotoIds.has(item.photoId)) {
          continue;
        }

        // Skip if photo is too new (< 2 seconds old)
        if (!readyPhotoIds.has(item.photoId)) {
          console.log(`[usePhotoSync] Skipping sync for photo ${item.photoId} - waiting for minimum age`);
          continue;
        }

        const success = await syncPhoto(item.photoId);

        if (success) {
          // Remove from sync queue
          await deleteSyncItem(item.id);
        }
      }

      console.log("[usePhotoSync] Photo sync completed");
    } catch (error) {
      console.error("[usePhotoSync] Failed to sync photos:", error);
    } finally {
      syncInProgressRef.current = false;
    }
  }, [isOnline, syncPhoto]);

  /**
   * Schedule a retry
   */
  const scheduleRetry = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      syncAllPhotos();
    }, RETRY_DELAY_MS);
  }, [syncAllPhotos]);

  /**
   * Initial sync on mount if online
   */
  useEffect(() => {
    console.log('[usePhotoSync] Hook mounted, checking for pending photos');
    if (isOnline) {
      console.log('[usePhotoSync] Online - triggering initial sync');
      // Small delay to avoid race conditions with photo capture
      setTimeout(() => {
        syncAllPhotos();
      }, 1000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  /**
   * When coming online, sync immediately
   */
  useEffect(() => {
    console.log('[usePhotoSync] Online status changed:', isOnline);
    if (isOnline) {
      console.log('[usePhotoSync] Triggering sync due to online status');
      syncAllPhotos();
    }
  }, [isOnline, syncAllPhotos]);

  /**
   * Periodic sync check (every 30 seconds)
   */
  useEffect(() => {
    if (!isOnline) {
      return;
    }

    const interval = setInterval(() => {
      syncAllPhotos();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isOnline, syncAllPhotos]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  /**
   * Manual trigger for sync (for immediate sync after photo capture)
   */
  const triggerSync = useCallback(() => {
    console.log('[usePhotoSync] Manual sync triggered');
    syncAllPhotos();
  }, [syncAllPhotos]);

  return {
    syncAllPhotos,
    scheduleRetry,
    triggerSync,
  };
}
