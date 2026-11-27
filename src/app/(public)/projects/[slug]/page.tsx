import { notFound } from "next/navigation";
import { projects } from "@/content/public-content";
import { ContentDetail } from "@/components/shared/destination";
import { pageMetadata } from "@/lib/site-metadata";
export function generateStaticParams() {
  return projects.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = projects.find((e) => e.slug === slug);
  return {
    ...pageMetadata(entry?.title ?? "Not found", "/projects/" + slug),
    robots: { index: false, follow: true },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = projects.find((e) => e.slug === slug);
  if (!entry) notFound();
  return <ContentDetail entry={entry} kind="projects" />;
}
