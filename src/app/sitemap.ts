import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site-config";
import { indexingEnabled } from "@/lib/site-metadata";
import { connection } from "next/server";
import { publicSettings, publicSitemap } from "@/features/cms/server/public";
import { publicPath } from "@/features/cms/public-routes";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!indexingEnabled) return [];
  await connection();
  const entries: MetadataRoute.Sitemap = [{ url: siteConfig.url }];
  const absolute = (path: string) => new URL(path, siteConfig.url).href;
  try {
    const [items, settings] = await Promise.all([publicSitemap(), publicSettings()]);
    for (const collection of new Set(items.map(item => item.collection))) entries.push({ url: absolute("/" + collection) });
    if (settings.contactText || settings.contactEmail) entries.push({ url: absolute("/contact") });
    for (const item of items) entries.push({ url: absolute(publicPath(item)), lastModified: item.saved_at });
  } catch {
    // Keep the baseline homepage in the sitemap during a database outage.
  }
  return entries;
}
