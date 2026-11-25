import Image from "next/image";
import Link from "next/link";
import { displayDate, mediaUse } from "./editor-fields";
import { collections, publicPath, type Collection } from "./public-routes";
import type { CmsPublicCard } from "./server/schema";

const filters: Partial<Record<Collection, readonly [string, string][]>> = {
  events: [["upcoming", "Upcoming"], ["past", "Past events"]],
  blogs: [["past-event", "Past events"], ["initiative", "Initiatives"]],
  partners: [["partner", "Partners"], ["sponsor", "Sponsors"]],
};

export const pageSize = 12;
export const maxPage = 100;

export function collectionQuery(collection: Collection, query: Record<string, string | string[] | undefined>) {
  const filter = typeof query.filter === "string" && filters[collection]?.some(([value]) => value === query.filter) ? query.filter : "";
  const sort = collection === "events" && query.sort === "latest" ? "latest" : "";
  const number = typeof query.page === "string" && /^\d{1,3}$/.test(query.page) ? Number(query.page) : 1;
  return { filter, sort, page: Math.max(1, Math.min(number, maxPage)) };
}

const control = "inline-flex min-h-11 items-center rounded-md border border-[#b6a1dc]/45 bg-[#151027] px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d0bcef]";
export const publicLink = "rounded-sm underline decoration-[#b6a1dc]/70 underline-offset-4 hover:text-[#d0bcef] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d0bcef]";

export function PublicUnavailable() {
  return <section className="mx-auto w-full max-w-3xl space-y-4 px-6 py-16">
    <h1 className="text-3xl font-semibold">Content temporarily unavailable</h1>
    <p>Try reloading in a moment.</p>
    <Link className={publicLink} href="/">Back to home</Link>
  </section>;
}

export function PublicCollection({ collection, query, rows }: {
  collection: Collection; query: ReturnType<typeof collectionQuery>; rows: CmsPublicCard[];
}) {
  const { filter, sort, page } = query;
  const { title, description } = collections[collection];
  const path = "/" + collection;
  function pageLink(number: number) {
    const params = new URLSearchParams();
    if (filter) params.set("filter", filter);
    if (sort) params.set("sort", sort);
    if (number > 1) params.set("page", String(number));
    return params.size ? path + "?" + params : path;
  }
  return <section className="mx-auto w-full max-w-6xl space-y-8 px-6 py-12 sm:px-10 sm:py-16">
    <header className="space-y-3 border-b border-[#b6a1dc]/20 pb-6">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
      <p className="max-w-xl text-[#c1b6d1]">{description}</p>
    </header>
    {filters[collection] && <form action={path} className="flex flex-wrap items-end gap-3 sm:gap-5">
      <label className="grid gap-1 text-sm font-medium">{collection === "events" ? "When" : "Category"}
        <select className={control} name="filter" defaultValue={filter}>
          <option value="">All</option>
          {filters[collection].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      {collection === "events" && <label className="grid gap-1 text-sm font-medium">Event date
        <select className={control} name="sort" defaultValue={sort}>
          <option value="">Earliest first</option><option value="latest">Latest first</option>
        </select>
      </label>}
      <button className={control + " hover:bg-[#251c39]"}>Apply filters</button>
    </form>}
    {rows.length === 0 ? <p className="rounded-lg border border-[#b6a1dc]/25 px-5 py-6 text-[#d0c2e8]">
      {page > 1 ? "There are no entries on this page." : filter ? "No published entries match this filter." : "No entries have been published here yet."}
    </p> : <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.slice(0, pageSize).map(item => {
        const image = mediaUse(item.image);
        return <li key={item.id} className="min-w-0 overflow-hidden rounded-lg border border-[#b6a1dc]/25 bg-[#14112b]">
          {image && <Image unoptimized src={"/api/cms/media/" + image.versionId} alt={image.alt} width={480} height={270}
            className="aspect-video w-full object-cover" />}
          <div className="space-y-2 p-5">
            {(item.featured || item.category || item.event_date) && <p className="text-sm text-[#d0c2e8]">
              {[item.featured && "Featured", item.category?.replaceAll("-", " "), item.event_date && displayDate(item.event_date)].filter(Boolean).join(" · ")}
            </p>}
            <h2 className="text-lg font-semibold break-words">
              <Link prefetch={false} className={publicLink} href={publicPath(item)}>{item.title}</Link>
            </h2>
            {item.summary && <p className="line-clamp-3 break-words text-sm leading-relaxed text-[#c1b6d1]">{item.summary}</p>}
          </div>
        </li>;
      })}
    </ul>}
    {(page > 1 || rows.length > pageSize && page < maxPage) && <nav aria-label="Pagination" className="flex flex-wrap items-center gap-4">
      {page > 1 && <Link prefetch={false} className={control} href={pageLink(page - 1)} rel="prev">Previous</Link>}
      <p className="text-sm">Page {page}</p>
      {rows.length > pageSize && page < maxPage && <Link prefetch={false} className={control} href={pageLink(page + 1)} rel="next">Next</Link>}
    </nav>}
  </section>;
}
