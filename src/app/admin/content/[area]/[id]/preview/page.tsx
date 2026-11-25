import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicShell } from "@/components/shared/public-shell";
import { PublicArticle } from "@/features/cms/public-article";
import { PublicContact } from "@/features/cms/public-contact";
import { PublicHome } from "@/features/cms/public-home";
import { articleCollection } from "@/features/cms/public-routes";
import { siteSettings } from "@/features/cms/site-settings";
import { publicSettings } from "@/features/cms/server/public";
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
  const settings = siteSettings(area === "settings" ? snapshot.fields : await publicSettings());

  return (
    <div className="mx-auto max-w-6xl">
      <aside aria-label="Preview status" className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 rounded-t-lg border border-primary/30 bg-background px-4 py-3 text-sm">
        <p><strong>Private preview</strong> · Saved revision {snapshot.version} · {displayDate(snapshot.saved_at)}</p>
        <a className={editorLink} href={"/admin/content/" + area + "/" + id}>Back to editor</a>
      </aside>
      {area === "settings" ? <>
        <PublicHome fields={snapshot.fields} preview />
        <div className="bg-[#090817] text-[#eeeaf7]"><PublicContact settings={settings} /></div>
      </> : <PublicShell settings={settings} preview>
        <PublicArticle collection={articleCollection(area, snapshot.fields.category)} snapshot={snapshot} preview />
      </PublicShell>}
    </div>
  );
}
