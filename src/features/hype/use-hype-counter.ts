"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { acknowledge, appendTap, claimWork, deferQueue, readQueue, releaseLease, retryQueue, type HypeQueue } from "@/features/hype/queue-store";
import { readHypeSnapshot } from "@/features/hype/types";

export type CounterStatus = "loading" | "ready" | "unavailable";
export type HypeFeedback = "failed" | "throttled" | "storage" | "blocked" | null;
export type HypeCounterState = {
  count: number | null;
  status: CounterStatus;
  feedback: HypeFeedback;
  canTap: boolean;
  queueTap: () => Promise<boolean>;
  retry: () => void;
};

const requestTimeoutMs = 8_000;

function retryDelay(header: string | null): number {
  if (!header) return 0;
  const seconds = Number(header);
  return Number.isFinite(seconds) ? Math.max(0, seconds * 1_000) : Math.max(0, Date.parse(header) - Date.now()) || 0;
}

export function useHypeCounter(): HypeCounterState {
  const [count, setCount] = useState<number | null>(null);
  const [status, setStatus] = useState<CounterStatus>("loading");
  const [feedback, setFeedback] = useState<HypeFeedback>(null);
  const [canTap, setCanTap] = useState(false);
  const active = useRef(false);
  const wake = useRef<() => void>(() => {});
  const channel = useRef<BroadcastChannel | null>(null);

  const publish = useCallback((queue: HypeQueue): void => {
    if (!active.current) return;
    const displayed = queue.confirmedCount === null ? null : queue.confirmedCount + (queue.queuedThrough - queue.acknowledgedThrough);
    setCount(displayed);
    if (displayed !== null) setStatus("ready");
    setCanTap(true);
  }, []);

  useEffect(() => {
    active.current = true;
    let disposed = false;
    let running = false;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController | undefined;
    const owner = crypto.randomUUID();
    const broadcast = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("gdgoc-sparks");
    channel.current = broadcast;

    function storageFailure(): void {
      if (disposed) return;
      setCanTap(false);
      setFeedback("storage");
      setStatus((previous) => previous === "loading" ? "unavailable" : previous);
    }

    function schedule(delay = 1_000): void {
      if (disposed || document.hidden) return;
      clearTimeout(timer);
      timer = setTimeout(() => void tick(), delay);
    }

    async function tick(): Promise<void> {
      if (disposed || running) return;
      running = true;
      let delay = 1_000;
      try {
        const savedQueue = await readQueue();
        publish(savedQueue);
        if (savedQueue.queuedThrough > savedQueue.acknowledgedThrough && savedQueue.nextAttemptAt > Date.now()) {
          delay = Math.max(25, Math.min(delay, savedQueue.nextAttemptAt - Date.now()));
        }
        if (disposed || document.hidden || !navigator.onLine) return;
        const work = await claimWork(owner);
        if (disposed || !work) return;
        controller = new AbortController();
        const { queue, kind } = work;
        const response = await fetch(kind === "read" ? `/api/hype?streamId=${queue.streamId}` : "/api/hype", {
          method: kind === "read" ? "GET" : "POST",
          ...(kind === "write" ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ streamId: queue.streamId, through: queue.inFlightThrough }) } : {}),
          cache: "no-store",
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(requestTimeoutMs)]),
        });
        if (response.ok) {
          const snapshot = readHypeSnapshot(await response.json());
          publish(await acknowledge(owner, snapshot));
          if (!disposed) setFeedback(null);
        } else {
          const saved = await deferQueue(owner, response.status, retryDelay(response.headers.get("Retry-After")));
          publish(saved);
          if (!disposed && response.status !== 429 && response.status !== 409) {
            setFeedback(response.status === 400 || response.status === 403 ? "blocked" : "failed");
            if (saved.confirmedCount === null) setStatus("unavailable");
          }
        }
        broadcast?.postMessage("changed");
      } catch (error) {
        if (disposed) return;
        try {
          const saved = await deferQueue(owner, 0, 0);
          publish(saved);
          setFeedback("failed");
          if (saved.confirmedCount === null) setStatus("unavailable");
        } catch { storageFailure(); }
        if (error instanceof DOMException && ["QuotaExceededError", "InvalidStateError", "SecurityError"].includes(error.name)) storageFailure();
      } finally {
        running = false;
        schedule(delay);
      }
    }

    function wakeSender(): void { schedule(0); }
    function stopSender(): void {
      clearTimeout(timer);
      controller?.abort();
      void releaseLease(owner).catch(() => {});
    }
    function visibilityChanged(): void {
      if (document.hidden) stopSender();
      else wakeSender();
    }
    wake.current = wakeSender;
    if (broadcast) broadcast.onmessage = wakeSender;
    window.addEventListener("online", wakeSender);
    document.addEventListener("visibilitychange", visibilityChanged);
    window.addEventListener("pagehide", stopSender);
    window.addEventListener("pageshow", wakeSender);
    schedule(0);
    return () => {
      disposed = true;
      active.current = false;
      clearTimeout(timer);
      controller?.abort();
      broadcast?.close();
      if (channel.current === broadcast) channel.current = null;
      window.removeEventListener("online", wakeSender);
      document.removeEventListener("visibilitychange", visibilityChanged);
      window.removeEventListener("pagehide", stopSender);
      window.removeEventListener("pageshow", wakeSender);
      void releaseLease(owner).catch(() => {});
    };
  }, [publish]);

  const queueTap = useCallback(async (): Promise<boolean> => {
    if (!active.current) return false;
    try {
      const result = await appendTap();
      publish(result.queue);
      if (!active.current) return false;
      if (!result.accepted) { setFeedback("throttled"); return false; }
      setFeedback((previous) => previous === "throttled" ? null : previous);
      channel.current?.postMessage("changed");
      wake.current();
      return true;
    } catch {
      if (active.current) { setCanTap(false); setFeedback("storage"); }
      return false;
    }
  }, [publish]);

  function retry(): void {
    void retryQueue().then((queue) => {
      publish(queue); setFeedback(null); wake.current(); channel.current?.postMessage("changed");
    }).catch(() => { setCanTap(false); setFeedback("storage"); });
  }

  return { count, status, feedback, canTap, queueTap, retry };
}
