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
import { uploadVisitPhoto } from "../api/client";

const RETRY_DELAY_MS = 5000; // 5 seconds
const MAX_RETRIES = 3;

export function usePhotoSync() {
  const isOnline = useOnlineStatus();
  const syncInProgressRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Sync a single photo
   */
  const syncPhoto = useCallback(async (photoId: string): Promise<boolean> => {
    try {
      const photo = await getPhotoById(photoId);
      if (!photo) {
        console.warn(`Photo ${photoId} not found in IndexedDB`);
        return false;
      }

      // Skip if already uploaded
      if (photo.status === "uploaded") {
        return true;
      }

      // Skip if max retries exceeded
      if (photo.uploadAttempts >= MAX_RETRIES) {
        console.warn(`Photo ${photoId} exceeded max retries`);
        await updatePhotoStatus(photoId, "failed", "Max retries exceeded");
        return false;
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

      // Delete from IndexedDB (no longer needed)
      await deletePhoto(photoId);

      console.log(`Photo ${photoId} uploaded successfully`);
      return true;
    } catch (error) {
      console.error(`Failed to sync photo ${photoId}:`, error);
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
      // Get all pending sync items
      const syncItems = await getPendingSyncItems();

      if (syncItems.length === 0) {
        return;
      }

      console.log(`Starting sync for ${syncItems.length} photos`);

      // Sync each photo
      for (const item of syncItems) {
        const success = await syncPhoto(item.photoId);

        if (success) {
          // Remove from sync queue
          await deleteSyncItem(item.id);
        }
      }

      console.log("Photo sync completed");
    } catch (error) {
      console.error("Failed to sync photos:", error);
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
   * When coming online, sync immediately
   */
  useEffect(() => {
    if (isOnline) {
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

  return {
    syncAllPhotos,
    scheduleRetry,
  };
}
