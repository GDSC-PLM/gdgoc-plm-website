import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site-config";
import { indexingEnabled } from "@/lib/site-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  return indexingEnabled ? [{ url: siteConfig.url }] : [];
}
