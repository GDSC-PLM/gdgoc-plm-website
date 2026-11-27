import { ExecutiveBoardSection } from "@/app/_home/executive-board-section";
import { Destination } from "@/components/shared/destination";
import { pageMetadata } from "@/lib/site-metadata";
export const metadata = {
  ...pageMetadata("Team | GDGoC PLM", "/team"),
  robots: { index: false, follow: true },
};
export default function Page() {
  return (
    <>
      <Destination
        title="Our team"
        description="Meet the people behind our community initiatives, workshops, and events."
      >
        <ExecutiveBoardSection artwork={null} frame={null} directory />
      </Destination>
    </>
  );
}
