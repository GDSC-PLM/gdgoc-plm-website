import { hypeStreamIdPattern, isCounterInteger, type HypeSnapshot } from "@/features/hype/types";

export const queueSettings = {
  maxPending: 1_000,
  batchSize: 10,
  collectionMs: 1_000,
  jitterMs: 250,
  leaseMs: 20_000,
  refreshMs: 15_000,
} as const;

export type HypeQueue = {
  streamId: string;
  queuedThrough: number;
  acknowledgedThrough: number;
  confirmedCount: number | null;
  inFlightThrough: number | null;
  nextAttemptAt: number;
  attempts: number;
  lastReadAt: number;
  leaseOwner: string | null;
  leaseUntil: number;
  blocked: boolean;
};

export type QueueWork = { queue: HypeQueue; kind: "read" | "write" };
let database: Promise<IDBDatabase> | undefined;

function openDatabase(): Promise<IDBDatabase> {
  if (database) return database;
  database = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("gdgoc-sparks", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("queue");
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Close older website tabs and try again."));
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); database = undefined; };
      resolve(db);
    };
  }).catch((error: unknown) => { database = undefined; throw error; });
  return database;
}

function newQueue(): HypeQueue {
  return {
    streamId: crypto.randomUUID(), queuedThrough: 0, acknowledgedThrough: 0,
    confirmedCount: null, inFlightThrough: null, nextAttemptAt: 0, attempts: 0,
    lastReadAt: 0, leaseOwner: null, leaseUntil: 0, blocked: false,
  };
}

function validateQueue(value: unknown): HypeQueue {
  if (typeof value !== "object" || value === null) throw new Error("Invalid saved sparks queue");
  const q = value as HypeQueue;
  if (typeof q.streamId !== "string" || !hypeStreamIdPattern.test(q.streamId) ||
      ![q.queuedThrough, q.acknowledgedThrough, q.nextAttemptAt, q.attempts, q.lastReadAt, q.leaseUntil].every(isCounterInteger) ||
      q.queuedThrough < q.acknowledgedThrough ||
      (q.confirmedCount !== null && !isCounterInteger(q.confirmedCount)) ||
      (q.inFlightThrough !== null && (!isCounterInteger(q.inFlightThrough) || q.inFlightThrough > q.queuedThrough)) ||
      (q.leaseOwner !== null && typeof q.leaseOwner !== "string") || typeof q.blocked !== "boolean") {
    throw new Error("Invalid saved sparks queue");
  }
  return q;
}

// Read/modify/write stays inside one transaction, including when two tabs tap together.
async function changeQueue<T>(change: (queue: HypeQueue) => T): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction("queue", "readwrite");
    const store = transaction.objectStore("queue");
    const request = store.get("community");
    let result: T;
    let failure: unknown;
    request.onsuccess = () => {
      try {
        const queue = request.result === undefined ? newQueue() : validateQueue(request.result);
        result = change(queue);
        store.put(queue, "community");
      } catch (error) { failure = error; transaction.abort(); }
    };
    transaction.oncomplete = () => resolve(result);
    transaction.onabort = () => reject(failure ?? transaction.error ?? new Error("Unable to save sparks"));
    transaction.onerror = () => { failure ??= transaction.error; };
  });
}

export async function readQueue(): Promise<HypeQueue> {
  const db = await openDatabase();
  const saved = await new Promise<HypeQueue | undefined>((resolve, reject) => {
    const transaction = db.transaction("queue", "readonly");
    const request = transaction.objectStore("queue").get("community");
    transaction.oncomplete = () => {
      try { resolve(request.result === undefined ? undefined : validateQueue(request.result)); }
      catch (error) { reject(error); }
    };
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
  });
  return saved ?? changeQueue((queue) => queue);
}

export function appendTap(): Promise<{ queue: HypeQueue; accepted: boolean }> {
  return changeQueue((queue) => {
    const pending = queue.queuedThrough - queue.acknowledgedThrough;
    if (pending >= queueSettings.maxPending || queue.queuedThrough === Number.MAX_SAFE_INTEGER ||
        (queue.confirmedCount !== null && queue.confirmedCount + pending >= Number.MAX_SAFE_INTEGER)) {
      return { queue, accepted: false };
    }
    if (pending === 0) queue.nextAttemptAt = Date.now() + queueSettings.collectionMs + Math.floor(Math.random() * queueSettings.jitterMs);
    queue.queuedThrough += 1;
    return { queue, accepted: true };
  });
}

export function claimWork(owner: string): Promise<QueueWork | null> {
  return changeQueue((queue) => {
    const now = Date.now();
    if (queue.blocked || queue.nextAttemptAt > now ||
        (queue.leaseOwner !== owner && queue.leaseUntil > now)) return null;
    const pending = queue.queuedThrough > queue.acknowledgedThrough;
    const needsRead = queue.lastReadAt === 0 || (!pending && now - queue.lastReadAt >= queueSettings.refreshMs);
    if (!needsRead && !pending) return null;
    queue.leaseOwner = owner;
    queue.leaseUntil = now + queueSettings.leaseMs;
    if (!needsRead && queue.inFlightThrough === null) {
      queue.inFlightThrough = Math.min(queue.queuedThrough, queue.acknowledgedThrough + queueSettings.batchSize);
    }
    return { queue, kind: needsRead ? "read" : "write" };
  });
}

export function acknowledge(owner: string, snapshot: HypeSnapshot): Promise<HypeQueue> {
  return changeQueue((queue) => {
    // A response from a previous sender must not undo a newer acknowledgement.
    if (snapshot.acknowledgedThrough >= queue.acknowledgedThrough) {
      queue.acknowledgedThrough = snapshot.acknowledgedThrough;
      queue.queuedThrough = Math.max(queue.queuedThrough, snapshot.acknowledgedThrough);
      queue.confirmedCount = Math.max(queue.confirmedCount ?? 0, snapshot.count);
      if (queue.inFlightThrough !== null && queue.inFlightThrough <= snapshot.acknowledgedThrough) queue.inFlightThrough = null;
    }
    queue.lastReadAt = Date.now();
    queue.attempts = 0;
    queue.nextAttemptAt = Date.now() + queueSettings.collectionMs + Math.floor(Math.random() * queueSettings.jitterMs);
    if (queue.leaseOwner === owner) { queue.leaseOwner = null; queue.leaseUntil = 0; }
    return queue;
  });
}

export function deferQueue(owner: string, status: number, retryAfterMs: number): Promise<HypeQueue> {
  return changeQueue((queue) => {
    if (queue.leaseOwner !== owner) return queue;
    queue.attempts += 1;
    const backoff = Math.min(30_000, 1_000 * 2 ** Math.min(queue.attempts - 1, 5) + Math.floor(Math.random() * queueSettings.jitterMs));
    queue.nextAttemptAt = Date.now() + Math.max(backoff, retryAfterMs);
    if (status === 409) queue.lastReadAt = 0;
    if (status === 400 || status === 403) queue.blocked = true;
    queue.leaseOwner = null;
    queue.leaseUntil = 0;
    return queue;
  });
}

export function releaseLease(owner: string): Promise<void> {
  return changeQueue((queue) => {
    if (queue.leaseOwner === owner) { queue.leaseOwner = null; queue.leaseUntil = 0; }
  });
}

export function retryQueue(): Promise<HypeQueue> {
  return changeQueue((queue) => {
    queue.blocked = false; queue.attempts = 0; queue.nextAttemptAt = 0; queue.lastReadAt = 0;
    return queue;
  });
}
