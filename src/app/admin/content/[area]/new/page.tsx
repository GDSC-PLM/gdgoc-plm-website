import { notFound } from "next/navigation";

import { ContentEditor } from "@/features/cms/content-editor";
import { editorValues, isEditorArea } from "@/features/cms/editor-fields";
import { cmsAreaLabels, requireCmsAccess } from "@/features/cms/server/access";
import { getCmsContentSchema, listCmsEditorContent } from "@/features/cms/server/content";
import { listEditorMedia } from "@/features/cms/server/media";
import { defaultSettingsDraft } from "@/features/cms/site-settings";
import { redirect } from "next/navigation";

export default async function NewDraftPage({ params }: PageProps<"/admin/content/[area]/new">) {
  const { area } = await params;
  if (!isEditorArea(area)) notFound();
  const { userId, access } = await requireCmsAccess({ edit: area });
  if (area === "settings") {
    const existing = (await listCmsEditorContent(area)).find(item => !item.archived_at);
    if (existing) redirect("/admin/content/settings/" + existing.id);
  }
  const [rules, media] = await Promise.all([getCmsContentSchema(area), area === "settings" ? [] : listEditorMedia(area)]);
  if (!rules) notFound();

  return <ContentEditor key={area} area={area} owner={userId} areaLabel={cmsAreaLabels[area]}
    fullAdmin={access.full_admin} initial={editorValues(rules, area === "settings" ? defaultSettingsDraft : undefined)} rules={rules} media={media} />;
}
