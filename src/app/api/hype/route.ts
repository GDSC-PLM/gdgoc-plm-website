import { randomUUID } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";

import {
  getHypeCount,
  getHypeSnapshot,
  HypeBatchError,
  HypeRateLimitError,
  incrementHypeBatch,
  incrementHypeCount,
} from "@/features/hype/server/counter";
import { hypeStreamIdPattern, isCounterInteger, type HypeBatch, type HypeCount, type HypeError, type HypeSnapshot } from "@/features/hype/types";

const browserCookie = "hype-browser";
const browserIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type HypeResponse = NextResponse<HypeCount | HypeSnapshot | HypeError>;

function jsonResponse(body: HypeCount | HypeSnapshot | HypeError, status = 200): HypeResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function getBrowserId(request: NextRequest): string | undefined {
  const value = request.cookies.get(browserCookie)?.value;
  return value && browserIdPattern.test(value) ? value : undefined;
}

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");

  return origin === request.nextUrl.origin && (!fetchSite || fetchSite === "same-origin");
}

async function readBatch(request: NextRequest): Promise<HypeBatch | null> {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 1024) {
        void reader.cancel().catch(() => undefined);
        throw new HypeBatchError("Tap payload is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (bytes === 0) return null;
  if (!request.headers.get("content-type")?.includes("application/json")) throw new HypeBatchError("Use a JSON tap payload.");
  const buffer = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
  let body: unknown;
  try { body = JSON.parse(new TextDecoder().decode(buffer)); }
  catch { throw new HypeBatchError("Invalid tap payload."); }
  if (typeof body !== "object" || body === null || Object.keys(body).length !== 2 ||
      !("streamId" in body) || typeof body.streamId !== "string" || !hypeStreamIdPattern.test(body.streamId) ||
      !("through" in body) || !isCounterInteger(body.through) || body.through < 1) {
    throw new HypeBatchError("Invalid tap payload.");
  }
  return { streamId: body.streamId, through: body.through };
}

export async function GET(request: NextRequest): Promise<HypeResponse> {
  const streamId = request.nextUrl.searchParams.get("streamId");
  if (streamId !== null && !hypeStreamIdPattern.test(streamId)) return jsonResponse({ error: "Invalid queue ID." }, 400);
  let response: HypeResponse;

  try {
    response = jsonResponse(streamId ? await getHypeSnapshot(streamId) : { count: await getHypeCount() });
  } catch {
    response = jsonResponse({ error: "Counter temporarily unavailable" }, 503);
  }

  if (!getBrowserId(request)) {
    response.cookies.set(browserCookie, randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/api/hype",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}

export async function POST(request: NextRequest): Promise<HypeResponse> {
  if (!isSameOrigin(request)) {
    return jsonResponse({ error: "Only same-origin taps are accepted." }, 403);
  }

  const browserId = getBrowserId(request);

  if (!browserId) {
    return jsonResponse({ error: "Load the counter before tapping." }, 409);
  }

  try {
    const batch = await readBatch(request);
    return jsonResponse(batch ? await incrementHypeBatch(browserId, batch) : { count: await incrementHypeCount(browserId) });
  } catch (error: unknown) {
    if (error instanceof HypeBatchError) return jsonResponse({ error: error.message }, 400);
    if (error instanceof HypeRateLimitError) {
      const response = jsonResponse({ error: error.message }, 429);
      response.headers.set("Retry-After", "1");
      return response;
    }

    return jsonResponse({ error: "Counter temporarily unavailable" }, 503);
  }
}
