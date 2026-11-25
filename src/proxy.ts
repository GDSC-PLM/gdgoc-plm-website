import { NextResponse, type NextRequest } from "next/server";

import { cmsCookieName, createCmsClient } from "@/features/cms/server/client";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (request.cookies.getAll().some(({ name }) =>
    name === cmsCookieName || name.startsWith(cmsCookieName + "."))) {
    const client = createCmsClient(request.cookies, (values, headers) => {
      for (const { name, value } of values) request.cookies.set(name, value);
      response = NextResponse.next({ request });
      for (const { name, value, options } of values) response.cookies.set(name, value, options);
      for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
    });
    await client?.auth.getClaims();
  }
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = { matcher: "/admin/:path*" };
