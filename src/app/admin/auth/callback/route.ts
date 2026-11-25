import { NextResponse } from "next/server";

import { cmsOrigin, cmsRequestClient } from "@/features/cms/server/client";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  const client = await cmsRequestClient(true);

  function go(path: string) {
    return NextResponse.redirect(new URL(path, cmsOrigin), {
      headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" },
    });
  }

  if (!code || !client) return go("/admin/login?status=denied");

  const { error } = await client.auth.exchangeCodeForSession(code);
  if (error) return go("/admin/login?status=denied");

  const accepted = await client.rpc("cms_accept_invitation");
  if (accepted.error || accepted.data !== true) {
    await client.auth.signOut({ scope: "local" });
    return go("/admin/login?status=denied");
  }
  return go("/admin");
}
