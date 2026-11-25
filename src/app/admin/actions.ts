"use server";

import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requireCmsAccess } from "@/features/cms/server/access";
import { cmsOrigin, cmsRequestClient, cmsSupabaseConfig } from "@/features/cms/server/client";
import { cmsAreas, type AccessChange, type CmsDatabase } from "@/features/cms/server/schema";

export async function startGoogleSignIn() {
  if ((await headers()).get("origin") !== cmsOrigin) redirect(cmsOrigin + "/admin/login");
  const config = cmsSupabaseConfig();
  const secret = process.env.CMS_SUPABASE_SECRET_KEY;
  const client = await cmsRequestClient(true);
  if (!config || !secret || !client) redirect("/admin/login?status=unavailable");

  const limiter = createClient<CmsDatabase>(config.url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { retry: false, timeout: 5_000 },
  });
  const limit = await limiter.rpc("cms_limit_sign_in");
  if (limit.error) redirect("/admin/login?status=unavailable");
  if (limit.data !== true) redirect("/admin/login?status=limited");

  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: cmsOrigin + "/admin/auth/callback" },
  });
  if (error || !data.url) redirect("/admin/login?status=unavailable");
  redirect(data.url);
}

export async function signOut() {
  const client = await cmsRequestClient(true);
  const result = await client?.auth.signOut({ scope: "local" });
  if (result?.error) redirect("/admin/login?status=signout");
  redirect("/admin/login");
}

export async function manageCmsAccess(form: FormData) {
  const { client } = await requireCmsAccess("publish", true);
  const operation = form.get("operation");
  const target = form.get("email");
  if (typeof target !== "string" || target.length > 254 ||
    (operation !== "invite" && operation !== "update_permissions" &&
      operation !== "cancel_invitation" && operation !== "revoke")) {
    redirect("/admin/access?status=invalid");
  }

  const args: AccessChange = { operation, target };
  if (operation === "invite" || operation === "update_permissions") {
    const role = form.get("role");
    const days = Number(form.get("days"));
    const selected = form.getAll("areas");
    const areas = cmsAreas.filter((area) => area !== "settings" && selected.includes(area));
    if ((operation === "invite" && (!Number.isInteger(days) || days < 1 || days > 30)) ||
      (role !== "full" && role !== "contributor") || areas.length !== selected.length ||
      (role === "contributor" && areas.length === 0)) {
      redirect("/admin/access?status=invalid");
    }
    args.grant_full = role === "full";
    args.grant_areas = role === "full" ? [] : areas;
    if (operation === "invite") args.days_valid = days;
  }

  const { error } = await client.rpc("cms_manage_access", args);
  if (error?.code === "42501") redirect("/admin/login?status=denied");
  redirect("/admin/access?status=" + (error ? "failed" : "saved"));
}
