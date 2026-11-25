import { notFound } from "next/navigation";
import { collectionQuery, PublicCollection, PublicUnavailable } from "@/features/cms/public-collection";
import { collections, isCollection } from "@/features/cms/public-routes";
import { publicList } from "@/features/cms/server/public";
import { indexingEnabled, pageMetadata } from "@/lib/site-metadata";
import { siteConfig } from "@/lib/site-config";

type Props = PageProps<"/[collection]">;

export async function generateMetadata({ params, searchParams }: Props) {
  const { collection } = await params;
  if (!isCollection(collection)) notFound();
  const { filter, sort, page } = collectionQuery(collection, await searchParams);
  const rows = await publicList(collection, filter, sort, page);
  const { title, description } = collections[collection];
  return {
    ...pageMetadata(title + " | " + siteConfig.name, "/" + collection, description),
    robots: { index: indexingEnabled && Boolean(rows?.length) && !filter && !sort && page === 1, follow: indexingEnabled },
  };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { collection } = await params;
  if (!isCollection(collection)) notFound();
  const query = collectionQuery(collection, await searchParams);
  const rows = await publicList(collection, query.filter, query.sort, query.page);
  if (!rows) return <PublicUnavailable />;
  return <PublicCollection collection={collection} query={query} rows={rows} />;
}
