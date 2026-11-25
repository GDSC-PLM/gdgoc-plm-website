import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { unstable_cache } from "next/cache";

import { cmsPublicCacheTag, invalidateCmsPublication } from "@/features/cms/server/content";

// The runner acknowledges the database outbox only after observing a fresh tagged value.
const generation = unstable_cache(async () => randomUUID(), ["cms-refresh-generation"], { tags: [cmsPublicCacheTag] });

async function refresh(request: Request) {
  const key = process.env.CMS_SUPABASE_SECRET_KEY;
  const token = request.headers.get("authorization") ?? "";
  if (!key || !/^127\.0\.0\.1(:\d+)?$/.test(request.headers.get("host") ?? "") || !/^Bearer [a-f0-9]{64}$/.test(token)) {
    return new Response(null, { status: 403 });
  }
  const expected = createHmac("sha256", key).update("cms-local-cache-refresh-v1").digest("hex");
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(token.slice(7)))) return new Response(null, { status: 403 });

  const previous = await generation();
  if (request.method === "POST") invalidateCmsPublication();
  return Response.json({ generation: previous }, { headers: { "Cache-Control": "private, no-store" } });
}

export { refresh as GET, refresh as POST };
