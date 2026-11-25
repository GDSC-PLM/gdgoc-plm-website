import "server-only";

import { createServerClient, type CookieOptions, type SetAllCookies } from "@supabase/ssr";
import { cookies } from "next/headers";
import { loopbackHttp } from "@/lib/local-http.mjs";
import type { CmsDatabase } from "./schema";

export const cmsOrigin = "http://127.0.0.1:3000";
export const cmsCookieName = "gdgoc-cms-auth";

export function cmsSupabaseConfig() {
  const url = process.env.CMS_SUPABASE_URL;
  const key = process.env.CMS_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !loopbackHttp(url) || !key) return null;
  return { url, key };
}

type RequestCookies = { getAll(): { name: string; value: string }[] };

export function createCmsClient(store: RequestCookies, setAll?: SetAllCookies) {
  const config = cmsSupabaseConfig();
  if (!config) return null;

  const cookieOptions: CookieOptions = {
    path: "/admin",
    httpOnly: true,
    sameSite: "lax",
    secure: false, // The app is restricted to the local HTTP origin.
  };
  return createServerClient<CmsDatabase>(config.url, config.key, {
    cookieOptions: { ...cookieOptions, name: cmsCookieName },
    cookies: { getAll: () => store.getAll(), setAll: setAll ?? (() => {}) },
    db: { retry: false, timeout: 5_000 },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

export async function cmsRequestClient(writable = false) {
  const store = await cookies();
  return createCmsClient(store, writable
    ? (values) => values.forEach(({ name, value, options }) => store.set(name, value, options))
    : undefined);
}
