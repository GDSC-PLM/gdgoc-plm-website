import { notFound } from "next/navigation";

import { ContentEditor } from "@/features/cms/content-editor";
import { editorValues, isCmsId, isEditorArea } from "@/features/cms/editor-fields";
import { cmsAreaLabels, requireCmsAccess } from "@/features/cms/server/access";
import { getCmsContent, getCmsContentSchema, getCmsRevision, listCmsContentActivity, listCmsRevisions } from "@/features/cms/server/content";
import { listEditorMedia } from "@/features/cms/server/media";

function cursor(raw: string | string[] | undefined) {
  return typeof raw === "string" && /^\d+$/.test(raw) && Number.isSafeInteger(Number(raw)) && Number(raw) > 0
    ? Number(raw) : undefined;
}

export default async function DraftPage({ params, searchParams }: PageProps<"/admin/content/[area]/[id]">) {
  const { area, id } = await params;
  if (!isEditorArea(area) || !isCmsId(id)) notFound();
  const { userId, access } = await requireCmsAccess({ edit: area });
  const record = await getCmsContent(id);
  if (!record || record.area !== area) notFound();
  const query = await searchParams;
  const [rules, draft, revisions, activity, media] = await Promise.all([
    getCmsContentSchema(area),
    getCmsRevision(id, record.draft_revision_id),
    listCmsRevisions(id, cursor(query.beforeRevision)),
    listCmsContentActivity(id, cursor(query.beforeActivity)),
    record.archived_at ? [] : listEditorMedia(area),
  ]);
  if (!rules || !draft) notFound();

  const history = new URLSearchParams();
  if (revisions.length >= 50) history.set("beforeRevision", String(revisions.at(-1)?.version));
  if (activity.length >= 50) history.set("beforeActivity", String(activity.at(-1)?.id));

  return <ContentEditor key={[id, record.draft_revision_id, record.published_revision_id, record.archived_at].join(":")}
    area={area} areaLabel={cmsAreaLabels[area]} owner={userId} fullAdmin={access.full_admin}
    initial={editorValues(rules, draft)} rules={rules} media={media} record={record} draftVersion={draft.version}
    revisions={revisions} activity={activity} result={typeof query.result === "string" ? query.result : undefined}
    earlierHistory={history.size ? "/admin/content/" + area + "/" + id + "?" + history : undefined} />;
}
