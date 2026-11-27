import { projects } from "@/content/public-content";
import { ContentCard } from "@/components/shared/content-card";
import { Destination } from "@/components/shared/destination";
import { pageMetadata } from "@/lib/site-metadata";
export const metadata = {
  ...pageMetadata("Projects | GDGoC PLM", "/projects"),
  robots: { index: false, follow: true },
};
export default function Page() {
  return (
    <Destination
      title="Projects"
      description="Explore what our student builders are creating."
    >
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((entry) => (
          <ContentCard key={entry.slug} entry={entry} kind="projects" />
        ))}
      </div>
    </Destination>
  );
}
