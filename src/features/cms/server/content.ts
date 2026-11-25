import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";

import { requireCmsAccess } from "./access";
import { createCmsClient } from "./client";
import { cmsAreas, type CmsArea, type CmsContent, type CmsEditorItem, type CmsPublicationArgs,
  type CmsPublishedContent, type CmsRevision, type CmsSnapshot } from "./schema";

export const cmsPublicCacheTag = "cms-public";

type ContentErrorCode = "invalid" | "denied" | "not_found" | "conflict" | "rate_limited" | "unavailable";

const messages: Record<ContentErrorCode, string> = {
  invalid: "Content input is invalid or incomplete.",
  denied: "Your account does not have permission for this operation.",
  not_found: "Content or revision was not found.",
  conflict: "Content changed or the published slug is in use. Reload before retrying.",
  rate_limited: "Too many content changes. Try again in one minute.",
  unavailable: "CMS content is temporarily unavailable.",
};

export class CmsContentError extends Error {
  constructor(readonly code: ContentErrorCode, readonly field?: string) {
    super(messages[code]);
    this.name = "CmsContentError";
  }
}

function databaseError({ code, details }: { code: string; details?: string }) {
  switch (code) {
    case "42501": return new CmsContentError("denied");
    case "PT404": return new CmsContentError("not_found");
    case "PT409":
    case "23505": return new CmsContentError("conflict");
    case "PT429": return new CmsContentError("rate_limited");
    case "22023": return new CmsContentError("invalid", details && /^[a-z][a-zA-Z]*$/.test(details) ? details : undefined);
    case "22P02":
    case "23502":
    case "23514": return new CmsContentError("invalid");
    default: return new CmsContentError("unavailable");
  }
}

function unwrap<T>(result: { data: T; error: null } | { data: null; error: { code: string; details?: string } }): T {
  if (result.error) throw databaseError(result.error);
  return result.data;
}

function validateId(id: string) {
  if (typeof id !== "string" || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) {
    throw new CmsContentError("invalid");
  }
}

function snapshotArgs(snapshot: CmsSnapshot) {
  if (!snapshot || typeof snapshot.title !== "string" ||
    (snapshot.slug !== null && typeof snapshot.slug !== "string") ||
    !snapshot.fields || typeof snapshot.fields !== "object" || Array.isArray(snapshot.fields)) {
    throw new CmsContentError("invalid");
  }
  const title = snapshot.title.trim();
  const slug = snapshot.slug?.trim() || null;
  if (Array.from(title).length > 160 ||
    (slug && (slug.length > 100 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))) ||
    Buffer.byteLength(JSON.stringify(snapshot.fields)) > 65_536) {
    throw new CmsContentError("invalid");
  }
  return { p_title: title, p_slug: slug, p_fields: snapshot.fields };
}

export async function createCmsContent(area: CmsArea, snapshot: CmsSnapshot) {
  if (!cmsAreas.includes(area)) throw new CmsContentError("invalid");
  const args = snapshotArgs(snapshot);
  const { client } = await requireCmsAccess({ edit: area }, true);
  const id = unwrap(await client.rpc("cms_create_content", { p_area: area, ...args }));
  revalidatePath("/admin", "layout");
  return id;
}

async function writeDraft(contentId: string, expectedDraftId: string,
  input: { snapshot: CmsSnapshot } | { sourceRevisionId: string }) {
  validateId(contentId);
  validateId(expectedDraftId);
  if ("sourceRevisionId" in input) validateId(input.sourceRevisionId);
  const args = "snapshot" in input ? snapshotArgs(input.snapshot) : { p_source_revision_id: input.sourceRevisionId };
  const { client } = await requireCmsAccess("access", true);
  const revisionId = unwrap(await client.rpc("cms_write_draft", {
    p_content_id: contentId, p_expected_draft_id: expectedDraftId, ...args,
  }));
  revalidatePath("/admin", "layout");
  return revisionId;
}

export function saveCmsDraft(contentId: string, expectedDraftId: string, snapshot: CmsSnapshot) {
  return writeDraft(contentId, expectedDraftId, { snapshot });
}

export function restoreCmsDraft(contentId: string, expectedDraftId: string, sourceRevisionId: string) {
  return writeDraft(contentId, expectedDraftId, { sourceRevisionId });
}

// Call after a successful database commit, including a replay after a lost response.
export function invalidateCmsPublication() {
  revalidateTag(cmsPublicCacheTag, { expire: 0 });
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin", "layout");
}

export async function applyCmsPublication(input: CmsPublicationArgs) {
  validateId(input.p_content_id);
  validateId(input.p_operation_id);
  if (input.p_action !== "publish" && input.p_action !== "unpublish" && input.p_action !== "archive") {
    throw new CmsContentError("invalid");
  }
  if (input.p_action === "unpublish") {
    if (input.p_revision_id !== null || input.p_expected_published_id === null) throw new CmsContentError("invalid");
  } else {
    if (input.p_revision_id === null) throw new CmsContentError("invalid");
    validateId(input.p_revision_id);
  }
  if (input.p_expected_published_id !== null) validateId(input.p_expected_published_id);

  const { client } = await requireCmsAccess("publish", true);
  const effect = unwrap(await client.rpc("cms_apply_publication", input).single());
  invalidateCmsPublication();
  return effect;
}

export async function getCmsContent(contentId: string) {
  validateId(contentId);
  const { client } = await requireCmsAccess();
  return unwrap<CmsContent | null>(await client.rpc("cms_get_content", { p_content_id: contentId }).maybeSingle<CmsContent>());
}

export async function getCmsContentSchema(area: CmsArea) {
  if (!cmsAreas.includes(area)) throw new CmsContentError("invalid");
  const { client } = await requireCmsAccess({ edit: area });
  return unwrap(await client.rpc("cms_content_schema", { p_area: area }));
}

export async function listCmsEditorContent(area: CmsArea) {
  const { client } = await requireCmsAccess({ edit: area });
  const items: CmsEditorItem[] = [];
  let after: string | undefined;
  for (;;) {
    const page = unwrap(await client.rpc("cms_list_editor_content", { p_area: area, p_after_id: after }));
    items.push(...page);
    if (page.length < 200) break;
    after = page.at(-1)?.id;
  }
  return items.sort((a, b) => Date.parse(b.saved_at) - Date.parse(a.saved_at));
}

export async function getCmsRevision(contentId: string, revisionId: string) {
  validateId(contentId);
  validateId(revisionId);
  const { client } = await requireCmsAccess();
  return unwrap<CmsRevision | null>(await client.rpc("cms_get_revision", {
    p_content_id: contentId, p_revision_id: revisionId,
  }).maybeSingle<CmsRevision>());
}

function validateCursor(cursor?: number) {
  if (cursor !== undefined && (!Number.isSafeInteger(cursor) || cursor < 1)) throw new CmsContentError("invalid");
}

export async function listCmsRevisions(contentId: string, beforeVersion?: number) {
  validateId(contentId);
  validateCursor(beforeVersion);
  const { client } = await requireCmsAccess();
  return unwrap(await client.rpc("cms_revision_history", { p_content_id: contentId, p_before_version: beforeVersion }));
}

export async function listCmsContentActivity(contentId: string, beforeEvent?: number) {
  validateId(contentId);
  validateCursor(beforeEvent);
  const { client } = await requireCmsAccess();
  return unwrap(await client.rpc("cms_content_activity", { p_content_id: contentId, p_before_event: beforeEvent }));
}

export async function getPublishedCmsContent(contentId: string) {
  validateId(contentId);
  const client = createCmsClient({ getAll: () => [] });
  if (!client) throw new CmsContentError("unavailable");
  return unwrap<CmsPublishedContent | null>(await client.rpc("cms_read_published", {
    p_content_id: contentId,
  }).maybeSingle<CmsPublishedContent>());
}
