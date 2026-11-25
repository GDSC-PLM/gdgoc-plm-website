import "server-only";

import { notFound, redirect } from "next/navigation";

import { cmsRequestClient } from "./client";
import type { CmsArea } from "./schema";

export const cmsAreaLabels: Record<CmsArea, string> = {
  events: "Events",
  blogs: "Blogs, projects, past events and initiatives",
  board: "Executive Board",
  partners: "Partners and sponsors",
  zines: "Zines",
  haribots: "Haribots",
  faq: "FAQ",
  games: "External games",
  settings: "Site settings",
};

type Permission = "access" | "publish" | { edit: CmsArea };

export async function requireCmsAccess(permission: Permission = "access", writable = false) {
  const client = await cmsRequestClient(writable);
  if (!client) redirect("/admin/login?status=unavailable");

  const claims = await client.auth.getClaims();
  if (!claims.data?.claims.sub) redirect("/admin/login");

  const { data, error } = await client.rpc("cms_my_access").maybeSingle();
  if (error) redirect("/admin/login?status=unavailable");
  if (!data) redirect("/admin/login?status=denied");
  if (permission === "publish" && !data.full_admin) notFound();
  if (typeof permission === "object" && !data.full_admin && !data.areas.includes(permission.edit)) {
    notFound();
  }

  return { client, access: data, userId: claims.data.claims.sub };
}
