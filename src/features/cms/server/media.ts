import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

import { requireCmsAccess } from "./access";
import { cmsOrigin, cmsSupabaseConfig, createCmsClient } from "./client";
import { CmsMediaError, isCmsMediaMime, readCmsMediaBody, validateCmsMediaFile } from "./media-file";
import { cmsAreas, type CmsArea, type CmsDatabase } from "./schema";

const bucket = "cms-media";
const idPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const noStore = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

function storageOperator() {
  const config = cmsSupabaseConfig();
  const secret = process.env.CMS_SUPABASE_SECRET_KEY;
  if (!config || !secret) throw new CmsMediaError(503, "Media is temporarily unavailable.");

  return createClient<CmsDatabase>(config.url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { retry: false, timeout: 10_000 },
    global: {
      fetch: (input, init) => fetch(input, {
        ...init,
        cache: "no-store",
        signal: init?.signal
          ? AbortSignal.any([init.signal, AbortSignal.timeout(15_000)])
          : AbortSignal.timeout(15_000),
      }),
    },
  });
}

function checksum(data: Buffer) {
  return createHash("sha256").update(data).digest("hex");
}

function originalFileName(value: string | null) {
  try {
    if (!value || value.length > 2048) throw new Error("File name");
    const name = decodeURIComponent(value).trim();
    if (!name || Array.from(name).length > 160 || /[\p{Cc}/\\]/u.test(name)) {
      throw new Error("File name");
    }
    return name;
  } catch {
    throw new CmsMediaError(400, "Choose a file with a valid name.");
  }
}

function mediaArea(value: string | null): CmsArea {
  const area = cmsAreas.find((choice) => choice === value && choice !== "settings");
  if (!area) throw new CmsMediaError(400, "Choose a content area.");
  return area;
}

function mediaDatabaseError(code: string) {
  if (code === "42501") return new CmsMediaError(403, "Media access denied.");
  if (code === "PT404") return new CmsMediaError(404, "Media not found.");
  if (code === "PT429") return new CmsMediaError(429, "Too many uploads. Try again in one minute.");
  if (code === "22023") return new CmsMediaError(422, "The media does not match this record.");
  return new CmsMediaError(503, "Media is temporarily unavailable.");
}

export async function uploadCmsMedia(request: Request) {
  if (request.headers.get("origin") !== cmsOrigin) throw new CmsMediaError(403, "Origin denied.");
  const query = new URL(request.url).searchParams;
  const area = mediaArea(query.get("area"));
  const mediaId = query.get("mediaId");
  if (mediaId !== null && !idPattern.test(mediaId)) throw new CmsMediaError(400, "Invalid media ID.");
  const mime = request.headers.get("content-type");
  if (!isCmsMediaMime(mime) || (mime === "application/pdf" && area !== "zines")) {
    throw new CmsMediaError(415, "Choose a JPEG, PNG, WebP, or a PDF for Zines.");
  }
  const name = originalFileName(request.headers.get("x-file-name"));

  const { client, userId } = await requireCmsAccess({ edit: area }, true);
  const authorization = await client.rpc("cms_authorize_upload", { p_area: area, p_media_id: mediaId });
  if (authorization.error) throw mediaDatabaseError(authorization.error.code);

  const { data, width, height } = await validateCmsMediaFile(await readCmsMediaBody(request, mime), mime);
  const versionId = randomUUID();
  const operator = storageOperator();
  const uploaded = await operator.storage.from(bucket).upload(versionId, data, { contentType: mime, upsert: false });
  if (uploaded.error) throw new CmsMediaError(503, "The file could not be stored.");

  // A failed network response can hide a committed record, so leave any unconfirmed object private.
  const saved = await operator.rpc("cms_record_media_version", {
    p_actor: userId, p_area: area, p_existing_media_id: mediaId, p_version_id: versionId,
    p_name: name, p_mime: mime, p_bytes: data.length, p_sha256: checksum(data), p_width: width, p_height: height,
  });
  if (saved.error) throw mediaDatabaseError(saved.error.code);
  return {
    media_id: saved.data, version_id: versionId, original_name: name,
    mime, bytes: data.length, width, height,
  };
}

export async function listCmsMedia(area: CmsArea, afterId?: string) {
  mediaArea(area);
  if (afterId !== undefined && !idPattern.test(afterId)) throw new CmsMediaError(400, "Invalid media cursor.");
  const { client } = await requireCmsAccess({ edit: area });
  const { data, error } = await client.rpc("cms_list_media", { p_area: area, p_after_id: afterId });
  if (error) throw mediaDatabaseError(error.code);
  return data;
}

export async function deliverCmsMedia(versionId: string, visibility: "draft" | "published") {
  if (!idPattern.test(versionId)) throw new CmsMediaError(404, "Media not found.");
  const client = visibility === "draft"
    ? (await requireCmsAccess()).client
    : createCmsClient({ getAll: () => [] });
  if (!client) throw new CmsMediaError(503, "Media is temporarily unavailable.");

  const lookup = visibility === "draft" ? "cms_get_draft_media" : "cms_get_public_media";
  const { data: metadata, error } = await client.rpc(lookup, { p_version_id: versionId }).maybeSingle();
  if (error) throw mediaDatabaseError(error.code);
  if (!metadata) throw new CmsMediaError(404, "Media not found.");

  const download = await storageOperator().storage.from(bucket).download(metadata.version_id);
  if (download.error) throw new CmsMediaError(503, "The stored file is unavailable.");
  const data = Buffer.from(await download.data.arrayBuffer());
  if (data.length !== metadata.bytes || checksum(data) !== metadata.sha256) {
    throw new CmsMediaError(503, "The stored file is unavailable.");
  }
  return new Response(new Uint8Array(data), {
    headers: {
      ...noStore,
      "Content-Type": metadata.mime,
      "Content-Length": String(metadata.bytes),
      "Content-Security-Policy": "default-src 'none'; sandbox",
      ...(metadata.mime === "application/pdf" ? { "Content-Disposition": 'attachment; filename="zine.pdf"' } : {}),
    },
  });
}

export function cmsMediaErrorResponse(error: unknown) {
  if (!(error instanceof CmsMediaError)) throw error;
  return Response.json({ error: error.message }, { status: error.status, headers: noStore });
}
