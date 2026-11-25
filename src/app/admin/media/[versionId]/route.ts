import { cmsMediaErrorResponse, deliverCmsMedia } from "@/features/cms/server/media";

export async function GET(_request: Request, context: RouteContext<"/admin/media/[versionId]">) {
  try {
    const { versionId } = await context.params;
    return await deliverCmsMedia(versionId, "draft");
  } catch (error) {
    return cmsMediaErrorResponse(error);
  }
}
