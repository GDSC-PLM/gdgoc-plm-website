import { notFound } from "next/navigation";

import { ContentEditor } from "@/features/cms/content-editor";
import { editorValues, isEditorArea } from "@/features/cms/editor-fields";
import { cmsAreaLabels, requireCmsAccess } from "@/features/cms/server/access";
import { getCmsContentSchema } from "@/features/cms/server/content";
import { listEditorMedia } from "@/features/cms/server/media";

export default async function NewDraftPage({ params }: PageProps<"/admin/content/[area]/new">) {
  const { area } = await params;
  if (!isEditorArea(area)) notFound();
  const { userId, access } = await requireCmsAccess({ edit: area });
  const [rules, media] = await Promise.all([getCmsContentSchema(area), listEditorMedia(area)]);
  if (!rules) notFound();

  return <ContentEditor key={area} area={area} owner={userId} areaLabel={cmsAreaLabels[area]}
    fullAdmin={access.full_admin} initial={editorValues(rules)} rules={rules} media={media} />;
}
