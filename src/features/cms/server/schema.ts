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
    };
  };
};
