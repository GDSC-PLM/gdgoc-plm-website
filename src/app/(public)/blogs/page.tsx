import { posts } from "@/content/public-content";
import { ContentCard } from "@/components/shared/content-card";
import { Destination } from "@/components/shared/destination";
import { pageMetadata } from "@/lib/site-metadata";
export const metadata = {
  ...pageMetadata("Blogs & Stories | GDGoC PLM", "/blogs"),
  robots: { index: false, follow: true },
};
export default function Page() {
  return (
    <Destination
      title="Blogs & Stories"
      description="Technical reflections and stories from our community."
    >
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((entry) => (
          <ContentCard key={entry.slug} entry={entry} kind="blogs" />
        ))}
      </div>
    </Destination>
  );
}
