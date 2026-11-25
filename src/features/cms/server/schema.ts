export const cmsAreas = [
  "events", "blogs", "board", "partners", "zines", "haribots", "faq", "games", "settings",
] as const;

export type CmsArea = (typeof cmsAreas)[number];
export type CmsAccess = { full_admin: boolean; areas: CmsArea[] };

type AccessRow = CmsAccess & {
  email: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  pending: boolean;
};

export type AccessChange = {
  operation: "invite" | "update_permissions" | "cancel_invitation" | "revoke";
  target: string;
  grant_full?: boolean;
  grant_areas?: CmsArea[];
  days_valid?: number;
};

type NoArgs = Record<never, never>;

export type CmsJson = string | number | boolean | null | CmsJson[] | { [key: string]: CmsJson };

export type CmsSnapshot = {
  title: string;
  slug: string | null;
  fields: Record<string, CmsJson>;
};

export type CmsContent = {
  id: string;
  area: CmsArea;
  draft_revision_id: string;
  published_revision_id: string | null;
  archived_at: string | null;
};

export type CmsRevisionSummary = {
  id: string;
  version: number;
  title: string;
  saved_by: string;
  saved_at: string;
  restored_from_revision_id: string | null;
};

export type CmsRevision = CmsRevisionSummary & CmsSnapshot;
export type CmsEditorItem = Pick<CmsContent, "id" | "draft_revision_id" | "published_revision_id" | "archived_at"> &
  Pick<CmsRevision, "title" | "slug" | "saved_at">;
export type CmsPublicationAction = "publish" | "unpublish" | "archive";

export type CmsContentActivity = {
  id: number;
  action: "create" | "save" | "restore" | CmsPublicationAction;
  actor_id: string;
  occurred_at: string;
  revision_id: string;
  previous_published_revision_id: string | null;
};

export type CmsPublishedContent = {
  id: string;
  area: CmsArea;
  title: string;
  slug: string;
};

export type CmsPublicationEffect = {
  content_id: string;
  area: CmsArea;
  action: CmsPublicationAction;
  previous_slug: string | null;
  current_slug: string | null;
  published_revision_id: string | null;
};

type ContentArgs = { p_content_id: string };
type SnapshotArgs = { p_title: string; p_slug: string | null; p_fields: CmsSnapshot["fields"] };
type WriteDraftArgs = ContentArgs & { p_expected_draft_id: string } &
  (SnapshotArgs | { p_source_revision_id: string });

export type CmsPublicationArgs = ContentArgs & {
  p_operation_id: string;
  p_action: CmsPublicationAction;
  p_revision_id: string | null;
  p_expected_published_id: string | null;
};

export type CmsFieldRule =
  | { type: "line" | "markdown"; max: number; required?: boolean }
  | { type: "choice"; values: string[]; required?: boolean }
  | { type: "labels" | "order" | "boolean" | "instant" | "date" | "https" | "registration" | "game" | "image" | "pdf";
      required?: boolean };

export type CmsMediaMime = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

export type CmsMediaChoice = {
  media_id: string;
  version_id: string;
  original_name: string;
  mime: CmsMediaMime;
  bytes: number;
  width: number | null;
  height: number | null;
};

type CmsMediaDelivery = Pick<CmsMediaChoice, "version_id" | "mime" | "bytes"> & { sha256: string };

export type CmsDatabase = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: {
      cms_my_access: { Args: NoArgs; Returns: CmsAccess[] };
      cms_accept_invitation: { Args: NoArgs; Returns: boolean };
      cms_list_access: { Args: NoArgs; Returns: AccessRow[] };
      cms_manage_access: { Args: AccessChange; Returns: undefined };
      cms_limit_sign_in: { Args: NoArgs; Returns: boolean };
      cms_create_content: { Args: SnapshotArgs & { p_area: CmsArea }; Returns: string };
      cms_write_draft: { Args: WriteDraftArgs; Returns: string };
      cms_apply_publication: { Args: CmsPublicationArgs; Returns: CmsPublicationEffect[] };
      cms_get_content: { Args: ContentArgs; Returns: CmsContent[] };
      cms_get_revision: { Args: ContentArgs & { p_revision_id: string }; Returns: CmsRevision[] };
      cms_revision_history: { Args: ContentArgs & { p_before_version?: number }; Returns: CmsRevisionSummary[] };
      cms_content_activity: { Args: ContentArgs & { p_before_event?: number }; Returns: CmsContentActivity[] };
      cms_read_published: { Args: ContentArgs; Returns: CmsPublishedContent[] };
      cms_list_editor_content: { Args: { p_area: CmsArea; p_after_id?: string }; Returns: CmsEditorItem[] };
      cms_content_schema: { Args: { p_area: CmsArea }; Returns: Record<string, CmsFieldRule> | null };
      cms_authorize_upload: { Args: { p_area: CmsArea; p_media_id: string | null }; Returns: undefined };
      cms_record_media_version: {
        Args: {
          p_actor: string; p_area: CmsArea; p_existing_media_id: string | null; p_version_id: string;
          p_name: string; p_mime: CmsMediaMime; p_bytes: number; p_sha256: string;
          p_width: number | null; p_height: number | null;
        };
        Returns: string;
      };
      cms_list_media: { Args: { p_area: CmsArea; p_after_id?: string }; Returns: CmsMediaChoice[] };
      cms_get_draft_media: { Args: { p_version_id: string }; Returns: CmsMediaDelivery[] };
      cms_get_public_media: { Args: { p_version_id: string }; Returns: CmsMediaDelivery[] };
    };
  };
};
