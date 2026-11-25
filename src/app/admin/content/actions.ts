"use server";

import {
  applyCmsPublication, CmsContentError, createCmsContent, getCmsContent, getCmsContentSchema,
  restoreCmsDraft, saveCmsDraft,
} from "@/features/cms/server/content";
import { fieldLabel, isCmsId, isEditorArea, parseEditorValues, type FieldErrors } from "@/features/cms/editor-fields";
import type { CmsPublicationArgs } from "@/features/cms/server/schema";

type Result = { ok: true; id: string } | { ok: false; message: string; errors?: FieldErrors };

function failure(error: unknown): Result {
  if (!(error instanceof CmsContentError)) throw error;
  if (!error.field) return { ok: false, message: error.message };
  const hints: Record<string, string> = {
    venue: "Enter a venue for in-person and hybrid events.",
    startsAt: "Enter a date and time with a UTC offset, such as 2026-12-11T18:30+08:00.",
    endsAt: "Enter a valid date and time with an offset. It must be at or after the start.",
    releaseDate: "Enter a valid calendar date.",
    registrationUrl: "Enter an approved Google Forms or Luma HTTPS link.",
    outboundUrl: "Enter an approved game URL from itch.io, GDevelop or Newgrounds.",
    cover: "Choose an available image and add alt text when the image conveys information.",
    download: "Choose an available Zine PDF.",
  };
  return {
    ok: false,
    message: "Review the highlighted field.",
    errors: { [error.field]: hints[error.field] ?? "Enter a valid " + fieldLabel(error.field).toLowerCase() + "." },
  };
}

export async function saveEditorDraft(area: string, id: string | null, expected: string | null, values: unknown): Promise<Result> {
  try {
    if (!isEditorArea(area) || (id !== null && (!isCmsId(id) || !isCmsId(expected)))) {
      throw new CmsContentError("invalid");
    }
    const rules = await getCmsContentSchema(area);
    if (!rules) throw new CmsContentError("not_found");
    const { snapshot, errors } = parseEditorValues(rules, values, area);
    if (Object.keys(errors).length) return { ok: false, message: "Fix the highlighted fields and save again.", errors };
    if (id !== null && expected !== null) {
      const current = await getCmsContent(id);
      if (!current || current.area !== area) throw new CmsContentError("not_found");
      await saveCmsDraft(id, expected, snapshot);
      return { ok: true, id };
    }
    return { ok: true, id: await createCmsContent(area, snapshot) };
  } catch (error) {
    return failure(error);
  }
}

export async function restoreEditorRevision(id: string, expected: string, source: string): Promise<Result> {
  try {
    await restoreCmsDraft(id, expected, source);
    return { ok: true, id };
  } catch (error) {
    return failure(error);
  }
}

export async function publishEditorRevision(input: CmsPublicationArgs): Promise<Result> {
  try {
    await applyCmsPublication(input);
    return { ok: true, id: input.p_content_id };
  } catch (error) {
    return failure(error);
  }
}
