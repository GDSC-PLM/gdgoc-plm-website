import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { landingFont } from "@/app/fonts";
import { CmsArticle } from "@/features/cms/cms-article";
import { displayDate, isCmsId, isEditorArea } from "@/features/cms/editor-fields";
import { editorLink } from "@/features/cms/editor-style";
import { requireCmsAccess } from "@/features/cms/server/access";
import { getCmsContent, getCmsRevision } from "@/features/cms/server/content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "CMS preview", robots: { index: false, follow: false } };

export default async function PreviewPage({ params, searchParams }: PageProps<"/admin/content/[area]/[id]/preview">) {
  const { area, id } = await params;
  if (!isEditorArea(area) || !isCmsId(id)) notFound();
  await requireCmsAccess({ edit: area });
  const record = await getCmsContent(id);
  if (!record || record.area !== area) notFound();

  const { revision } = await searchParams;
  const revisionId = revision ?? record.draft_revision_id;
  if (!isCmsId(revisionId)) notFound();
  const snapshot = await getCmsRevision(id, revisionId);
  if (!snapshot) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <aside aria-label="Preview status" className="flex flex-wrap items-center justify-between gap-3 rounded-t-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
        <p><strong>Private preview</strong> · Saved revision {snapshot.version} · {displayDate(snapshot.saved_at)}</p>
        <a className={editorLink} href={"/admin/content/" + area + "/" + id}>Back to editor</a>
      </aside>
      <div className={landingFont.variable + " rounded-b-lg bg-[#090817] font-(family-name:--font-landing) selection:bg-[#b6a1dc]/25"}>
        <CmsArticle area={area} snapshot={snapshot} mediaRoot="/admin/media" />
      </div>
    </div>
  );
}
