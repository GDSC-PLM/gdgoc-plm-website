import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site-config";
import { indexingEnabled } from "@/lib/site-metadata";

export default function robots(): MetadataRoute.Robots {
  return indexingEnabled
    ? { rules: { userAgent: "*", allow: "/", disallow: "/api/" }, sitemap: new URL("/sitemap.xml", siteConfig.url).href }
    : { rules: { userAgent: "*", disallow: "/" } };
}
