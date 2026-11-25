import { notFound, permanentRedirect } from "next/navigation";
import { mediaUse } from "@/features/cms/editor-fields";
import { PublicArticle } from "@/features/cms/public-article";
import { PublicUnavailable } from "@/features/cms/public-collection";
import { isCollection, publicPath } from "@/features/cms/public-routes";
import { publicArticle } from "@/features/cms/server/public";
import { siteConfig } from "@/lib/site-config";
import { indexingEnabled, pageMetadata } from "@/lib/site-metadata";

type Props = PageProps<"/[collection]/[slug]">;

async function resolve(params: Props["params"]) {
  const { collection, slug } = await params;
  if (!isCollection(collection)) notFound();
  const result = await publicArticle(collection, slug);
  if (result.state === "missing") notFound();
  if (result.state === "redirect") permanentRedirect(publicPath(result.current));
  return { collection, slug, result };
}

export async function generateMetadata({ params }: Props) {
  const { collection, slug, result } = await resolve(params);
  if (result.state !== "published") return { title: "Content temporarily unavailable", robots: { index: false, follow: false } };
  const { title, fields } = result.snapshot;
  const field = (key: string) => typeof fields[key] === "string" ? fields[key] : "";
  const description = field("metaDescription") || [field("description"), field("body"), field("bio"), field("answer")]
    .find(Boolean)?.replace(/[#*_~`]/g, "").replace(/\s+/g, " ").slice(0, 170) || title;
  const metadata = pageMetadata((field("metaTitle") || title) + " | " + siteConfig.name, publicPath({ collection, slug }), description);
  const image = mediaUse(fields.socialImage ?? fields.cover ?? fields.photo ?? fields.logo ?? null);
  if (image) {
    const sharingImage = { url: new URL("/api/cms/media/" + image.versionId, siteConfig.url).href, alt: image.alt };
    return { ...metadata, robots: { index: indexingEnabled, follow: indexingEnabled },
      openGraph: { ...metadata.openGraph, images: [sharingImage] }, twitter: { ...metadata.twitter, images: [sharingImage] } };
  }
  return { ...metadata, robots: { index: indexingEnabled, follow: indexingEnabled } };
}

export default async function DetailPage({ params }: Props) {
  const { collection, result } = await resolve(params);
  if (result.state !== "published") return <PublicUnavailable />;
  return <PublicArticle collection={collection} snapshot={result.snapshot} />;
}
