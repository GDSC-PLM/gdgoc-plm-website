import { cmsMediaErrorResponse, uploadCmsMedia } from "@/features/cms/server/media";

export async function POST(request: Request) {
  try {
    const media = await uploadCmsMedia(request);
    return Response.json(media, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return cmsMediaErrorResponse(error);
  }
}
