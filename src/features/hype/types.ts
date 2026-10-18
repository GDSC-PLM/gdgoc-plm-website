export type HypeCount = {
  count: number;
};

export type HypeSnapshot = HypeCount & {
  acknowledgedThrough: number;
};

export type HypeBatch = {
  streamId: string;
  through: number;
};

export const hypeStreamIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCounterInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function readHypeSnapshot(value: unknown): HypeSnapshot {
  if (typeof value !== "object" || value === null || !("count" in value) ||
      !("acknowledgedThrough" in value) || !isCounterInteger(value.count) ||
      !isCounterInteger(value.acknowledgedThrough)) {
    throw new Error("Invalid counter response");
  }
  return { count: value.count, acknowledgedThrough: value.acknowledgedThrough };
}

export type HypeError = {
  error: string;
};
