import { LaborWorker, CashTransaction, UserProfile } from "../types";
import {
  syncWorkerToCloud,
  deleteWorkerFromCloud,
  syncTransactionToCloud,
  deleteTransactionFromCloud,
  syncProfileToCloud
} from "./firebaseSync";

interface SyncDeltaQueue {
  dirtyWorkerIds: Set<string>;
  deletedWorkerIds: Set<string>;
  dirtyTransactionIds: Set<string>;
  deletedTransactionIds: Set<string>;
  isProfileDirty: boolean;
}

const queue: SyncDeltaQueue = {
  dirtyWorkerIds: new Set<string>(),
  deletedWorkerIds: new Set<string>(),
  dirtyTransactionIds: new Set<string>(),
  deletedTransactionIds: new Set<string>(),
  isProfileDirty: false
};

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let isFlushing = false;

// Provider to get fresh state without circular dependencies
let getStateFn: (() => {
  firebaseUid: string | null;
  workers: LaborWorker[];
  transactions: CashTransaction[];
  userProfile: UserProfile;
  isCloudSyncEnabled: boolean;
}) | null = null;

export function registerSyncStateProvider(fn: typeof getStateFn) {
  getStateFn = fn;
}

/**
 * Schedule a debounced flush (2.5 seconds idle delay)
 */
function scheduleDebouncedFlush() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    flushSyncQueue();
  }, 2500);
}

/**
 * Queue a worker for delta update/create
 */
export function queueWorkerChange(workerId: string) {
  queue.deletedWorkerIds.delete(workerId);
  queue.dirtyWorkerIds.add(workerId);
  scheduleDebouncedFlush();
}

/**
 * Queue a worker for deletion from Firestore
 */
export function queueWorkerDelete(workerId: string) {
  queue.dirtyWorkerIds.delete(workerId);
  queue.deletedWorkerIds.add(workerId);
  scheduleDebouncedFlush();
}

/**
 * Queue a transaction for delta update/create
 */
export function queueTransactionChange(txId: string) {
  queue.deletedTransactionIds.delete(txId);
  queue.dirtyTransactionIds.add(txId);
  scheduleDebouncedFlush();
}

/**
 * Queue a transaction for deletion from Firestore
 */
export function queueTransactionDelete(txId: string) {
  queue.dirtyTransactionIds.delete(txId);
  queue.deletedTransactionIds.add(txId);
  scheduleDebouncedFlush();
}

/**
 * Queue profile settings update
 */
export function queueProfileChange() {
  queue.isProfileDirty = true;
  scheduleDebouncedFlush();
}

/**
 * Clear all pending queues (used on logout and account switch)
 */
export function clearSyncQueue() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  queue.dirtyWorkerIds.clear();
  queue.deletedWorkerIds.clear();
  queue.dirtyTransactionIds.clear();
  queue.deletedTransactionIds.clear();
  queue.isProfileDirty = false;
}

/**
 * Check if there are pending delta changes waiting to sync
 */
export function hasPendingChanges(): boolean {
  return (
    queue.dirtyWorkerIds.size > 0 ||
    queue.deletedWorkerIds.size > 0 ||
    queue.dirtyTransactionIds.size > 0 ||
    queue.deletedTransactionIds.size > 0 ||
    queue.isProfileDirty
  );
}

/**
 * Flush all delta changes to Firebase Firestore silently in the background
 */
export async function flushSyncQueue(): Promise<boolean> {
  if (isFlushing || !hasPendingChanges()) return false;
  if (!getStateFn) return false;

  const state = getStateFn();
  if (!state.firebaseUid || !state.isCloudSyncEnabled) {
    return false;
  }

  const uid = state.firebaseUid;
  isFlushing = true;

  // Snapshot current delta items to sync
  const workersToSync = Array.from(queue.dirtyWorkerIds);
  const workersToDelete = Array.from(queue.deletedWorkerIds);
  const txsToSync = Array.from(queue.dirtyTransactionIds);
  const txsToDelete = Array.from(queue.deletedTransactionIds);
  const syncProfile = queue.isProfileDirty;

  // Clear current queue so new modifications during network call are tracked
  queue.dirtyWorkerIds.clear();
  queue.deletedWorkerIds.clear();
  queue.dirtyTransactionIds.clear();
  queue.deletedTransactionIds.clear();
  queue.isProfileDirty = false;

  try {
    const promises: Promise<void>[] = [];

    // 1. Delete removed workers from cloud
    for (const wId of workersToDelete) {
      promises.push(deleteWorkerFromCloud(uid, wId));
    }

    // 2. Upload only modified/added workers
    for (const wId of workersToSync) {
      const worker = state.workers.find((w) => w.id === wId);
      if (worker) {
        promises.push(syncWorkerToCloud(uid, worker));
      }
    }

    // 3. Delete removed transactions from cloud
    for (const tId of txsToDelete) {
      promises.push(deleteTransactionFromCloud(uid, tId));
    }

    // 4. Upload only modified/added transactions
    for (const tId of txsToSync) {
      const tx = state.transactions.find((t) => t.id === tId);
      if (tx) {
        promises.push(syncTransactionToCloud(uid, tx));
      }
    }

    await Promise.all(promises);

    // 5. Update root user summary doc once at the end
    await syncProfileToCloud(uid, state.userProfile, state.workers, state.transactions);

    return true;
  } catch (err) {
    console.warn("[SyncQueue] Background sync error, will retry later:", err);
    // Re-queue items if failed
    for (const id of workersToSync) queue.dirtyWorkerIds.add(id);
    for (const id of workersToDelete) queue.deletedWorkerIds.add(id);
    for (const id of txsToSync) queue.dirtyTransactionIds.add(id);
    for (const id of txsToDelete) queue.deletedTransactionIds.add(id);
    if (syncProfile) queue.isProfileDirty = true;
    return false;
  } finally {
    isFlushing = false;
  }
}

// Auto-flush on page unload / hide / online
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    flushSyncQueue();
  });

  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushSyncQueue();
    }
  });

  window.addEventListener("beforeunload", () => {
    flushSyncQueue();
  });
}
