import Link from "next/link";
import { CmsArticle } from "./cms-article";
import { publicLink } from "./public-collection";
import { collections, type Collection } from "./public-routes";
import type { CmsSnapshot } from "./server/schema";

export function PublicArticle({ collection, snapshot, preview }: {
  collection: Collection; snapshot: CmsSnapshot; preview?: boolean;
}) {
  return <div className="w-full">
    <div className="mx-auto w-full max-w-3xl px-5 pt-8 sm:px-8">
      <Link href={"/" + collection} prefetch={false} className={publicLink}>All {collections[collection].title.toLowerCase()}</Link>
    </div>
    <CmsArticle area={collections[collection].area} snapshot={snapshot} mediaRoot={preview ? "/admin/media" : "/api/cms/media"} />
  </div>;
}
