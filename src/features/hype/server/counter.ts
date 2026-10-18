import "server-only";

import { createHypeClient } from "@/features/hype/server/client";
import { readHypeSnapshot, type HypeBatch, type HypeSnapshot } from "@/features/hype/types";

export class HypeBatchError extends Error {}

export class HypeRateLimitError extends Error {
  constructor() {
    super("Please pause for a second before tapping again.");
    this.name = "HypeRateLimitError";
  }
}

function requireCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error("Counter temporarily unavailable");
  }

  return value;
}

export async function getHypeCount(): Promise<number> {
  const { data, error } = await createHypeClient()
    .from("hype_counter")
    .select("count")
    .eq("id", true)
    .single();

  if (error) {
    throw new Error("Counter temporarily unavailable");
  }

  return requireCount(data?.count);
}

export async function incrementHypeCount(browserId: string): Promise<number> {
  const { data, error } = await createHypeClient().rpc("increment_hype", {
    p_browser_id: browserId,
  });

  if (error?.code === "P0001" && error.message === "hype_rate_limited") {
    throw new HypeRateLimitError();
  }

  if (error) {
    throw new Error("Counter temporarily unavailable");
  }

  return requireCount(data);
}

export async function getHypeSnapshot(streamId: string): Promise<HypeSnapshot> {
  const { data, error } = await createHypeClient().rpc("get_hype_snapshot", { p_stream_id: streamId });
  if (error) throw new Error("Counter temporarily unavailable");
  return readHypeSnapshot(data);
}

export async function incrementHypeBatch(browserId: string, batch: HypeBatch): Promise<HypeSnapshot> {
  const { data, error } = await createHypeClient().rpc("increment_hype_batch", {
    p_browser_id: browserId, p_stream_id: batch.streamId, p_through: batch.through,
  });
  if (error?.code === "P0001" && error.message === "hype_rate_limited") throw new HypeRateLimitError();
  if (error?.code === "22023") throw new HypeBatchError("Invalid tap sequence.");
  if (error) throw new Error("Counter temporarily unavailable");
  return readHypeSnapshot(data);
}
