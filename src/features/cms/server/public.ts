import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";
import { isCmsId } from "../editor-fields";
import { createCmsClient } from "./client";
import { cmsPublicCacheTag } from "./content";
import type { CmsPublicRoute, CmsSnapshot } from "./schema";

function publicClient() {
  const client = createCmsClient({ getAll: () => [] });
  if (!client) throw new Error("Public content is unavailable.");
  return client;
}

function read<T>(result: { data: T; error: null } | { data: null; error: unknown }): T {
  if (result.error) throw new Error("Public content is unavailable.");
  return result.data as T;
}

const cachedArticle = unstable_cache(async (revision: string) => {
  const snapshot = read(await publicClient().rpc("cms_public_article", { p_revision: revision }).maybeSingle<CmsSnapshot>());
  if (!snapshot) throw new Error("The publication changed during this request.");
  return snapshot;
}, ["cms-article"], { tags: [cmsPublicCacheTag], revalidate: 300 });

export const publicArticle = cache(async (collection: string, slug: string) => {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 100) return { state: "missing" } as const;
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const current = read(await publicClient().rpc("cms_public_lookup", {
        p_collection: collection, p_slug: slug,
      }).maybeSingle<CmsPublicRoute & { revision_id: string }>());
      if (!current) return { state: "missing" } as const;
      if (current.collection !== collection || current.slug !== slug) return { state: "redirect", current } as const;
      try {
        return { state: "published", snapshot: await cachedArticle(current.revision_id) } as const;
      } catch (error) {
        if (attempt === 1) throw error;
      }
    }
  } catch {
    return { state: "unavailable" } as const;
  }
  return { state: "unavailable" } as const;
});

export const publicList = cache(async (collection: string, filter: string, sort: string, page: number) => {
  try {
    return read(await publicClient().rpc("cms_public_list", {
      p_collection: collection, p_filter: filter, p_sort: sort, p_page: page,
    }));
  } catch {
    return null;
  }
});

export const fallbackSettings: CmsSnapshot["fields"] = {};

export const publicSettings = cache(async (): Promise<CmsSnapshot["fields"]> => {
  try {
    return read(await publicClient().rpc("cms_public_settings")) ?? fallbackSettings;
  } catch {
    return fallbackSettings;
  }
});

export async function publicFeatured(value: CmsSnapshot["fields"][string] | undefined) {
  const ids = Array.isArray(value) ? value.flatMap(row => Array.isArray(row) && isCmsId(row[0]) ? [row[0]] : []) : [];
  if (!ids.length) return [];
  try {
    return read(await publicClient().rpc("cms_public_featured", { p_ids: ids }));
  } catch {
    return [];
  }
}

export async function publicSitemap() {
  const rows = [];
  let cursor: string | undefined;
  while (rows.length < 49_500) {
    const page = read(await publicClient().rpc("cms_public_sitemap", { p_after: cursor }));
    rows.push(...page);
    if (page.length < 500) break;
    cursor = page.at(-1)?.id;
  }
  return rows;
}
