import Link from "next/link";
import { notFound } from "next/navigation";

import { cmsAreaLabels, requireCmsAccess } from "@/features/cms/server/access";
import { listCmsEditorContent } from "@/features/cms/server/content";
import { displayDate, isEditorArea, publicationStatus } from "@/features/cms/editor-fields";
import { editorLink, editorPrimary } from "@/features/cms/editor-style";
import type { CmsEditorItem } from "@/features/cms/server/schema";

function ItemList({ items, base }: { items: CmsEditorItem[]; base: string }) {
  return (
    <ul className="divide-y border-y">
      {items.map((item) => (
        <li key={item.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4">
          <div className="min-w-0">
            {/* A document navigation lets the edit form warn before browser Back. */}
            <a href={base + "/" + item.id} className={editorLink + " break-words"}>
              {item.title || "Untitled draft"}
            </a>
            {item.slug && <p className="mt-1 break-all text-xs text-foreground/70">{item.slug}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full border bg-muted/50 px-3 py-1 font-medium">{publicationStatus(item)}</span>
            <time dateTime={item.saved_at} className="text-foreground/70">{displayDate(item.saved_at)}</time>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function AreaPage({ params }: PageProps<"/admin/content/[area]">) {
  const { area } = await params;
  if (!isEditorArea(area)) notFound();
  await requireCmsAccess({ edit: area });
  const items = await listCmsEditorContent(area);
  const active = items.filter((item) => !item.archived_at);
  const archived = items.filter((item) => item.archived_at);
  const base = "/admin/content/" + area;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/admin" className={editorLink}>CMS dashboard</Link>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-4">
        <h1 className="text-3xl font-semibold tracking-tight">{cmsAreaLabels[area]}</h1>
        {(area !== "settings" || active.length === 0) && <a href={base + "/new"} className={editorPrimary}>New draft</a>}
      </header>
      {active.length ? <ItemList items={active} base={base} /> : (
        <p className="rounded-md border bg-muted/40 p-4 text-sm">No active content here yet. Start with a new draft.</p>
      )}
      {archived.length > 0 && (
        <details className="space-y-3">
          <summary className="cursor-pointer rounded-sm font-semibold focus-visible:outline-2 focus-visible:outline-primary">Archived content</summary>
          <ItemList items={archived} base={base} />
        </details>
      )}
    </div>
  );
}
