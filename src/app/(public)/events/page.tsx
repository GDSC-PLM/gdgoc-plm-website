import { events } from "@/content/public-content";
import { ContentCard } from "@/components/shared/content-card";
import { Destination } from "@/components/shared/destination";
import { pageMetadata } from "@/lib/site-metadata";
export const metadata = {
  ...pageMetadata("Events | GDGoC PLM", "/events"),
  robots: { index: false, follow: true },
};
export default function Page() {
  return (
    <Destination
      title="Events"
      description="Explore our community gatherings, workshops, and hackathons."
    >
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {events.map((entry) => (
          <ContentCard key={entry.slug} entry={entry} kind="events" />
        ))}
      </div>
    </Destination>
  );
}
