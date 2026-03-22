// mobile-cleaner/src/services/syncService.ts
/**
 * M006/S03: Offline Sync Service
 *
 * Listens to NetInfo for connectivity changes and flushes the outbox
 * whenever the device comes back online.
 *
 * Usage:
 *   // In App root (e.g. App.tsx):
 *   import { startSyncService, stopSyncService } from "@/services/syncService";
 *   useEffect(() => {
 *     startSyncService(apiClient);
 *     return () => stopSyncService();
 *   }, []);
 */

import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { flush } from "../offline/outbox";
import { OutboxItem } from "../offline/types";

type ApiClient = (item: OutboxItem) => Promise<void>;

let _unsubscribe: (() => void) | null = null;
let _isFlushing = false;

/**
 * Process a single OutboxItem using the provided API client functions.
 * The apiClient callback is responsible for calling the right endpoint.
 */
async function defaultProcessor(item: OutboxItem, apiClient: ApiClient): Promise<void> {
  await apiClient(item);
}

/**
 * Start the NetInfo listener. Calls flush() when connectivity is restored.
 *
 * @param apiClient - function that dispatches an OutboxItem to the API
 */
export function startSyncService(apiClient: ApiClient): void {
  if (_unsubscribe) return; // Already running

  _unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    const isOnline = state.isConnected && state.isInternetReachable !== false;
    if (isOnline && !_isFlushing) {
      _isFlushing = true;
      flush((item) => defaultProcessor(item, apiClient))
        .then(({ processed, exhausted }) => {
          if (processed > 0 || exhausted > 0) {
            console.log(
              `[SyncService] Flushed: ${processed} sent, ${exhausted} exhausted`
            );
          }
        })
        .catch((err) => {
          console.warn("[SyncService] Flush error:", err);
        })
        .finally(() => {
          _isFlushing = false;
        });
    }
  });
}

/**
 * Stop the NetInfo listener. Call on unmount or logout.
 */
export function stopSyncService(): void {
  if (_unsubscribe) {
    _unsubscribe();
    _unsubscribe = null;
  }
}

/**
 * Manually trigger a flush (e.g. on app foreground event).
 */
export async function triggerSync(apiClient: ApiClient): Promise<void> {
  if (_isFlushing) return;
  const state = await NetInfo.fetch();
  const isOnline = state.isConnected && state.isInternetReachable !== false;
  if (!isOnline) return;

  _isFlushing = true;
  try {
    const result = await flush((item) => defaultProcessor(item, apiClient));
    if (result.processed > 0 || result.exhausted > 0) {
      console.log(
        `[SyncService] Manual flush: ${result.processed} sent, ${result.exhausted} exhausted`
      );
    }
  } finally {
    _isFlushing = false;
  }
}
