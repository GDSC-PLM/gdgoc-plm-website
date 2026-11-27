import Link from "next/link";
import { AboutSection, AvpSection } from "@/app/_home/introduction-sections";
import { Destination } from "@/components/shared/destination";
import { homeButtonClass } from "@/app/_home/home-config";
import { pageMetadata } from "@/lib/site-metadata";
export const metadata = {
  ...pageMetadata("About | GDGoC PLM", "/about"),
  robots: { index: false, follow: true },
};
export default function Page() {
  return (
    <>
      <Destination
        compact
        title="About GDGoC PLM"
        description="A community of student developers, designers, and builders at PLM, where curiosity meets code."
      >
        <div className="flex flex-wrap gap-3">
          {[
            ["Meet our team", "/team"],
            ["Our partners", "/partners"],
            ["Contact us", "/contact"],
          ].map(([label, href]) => (
            <Link key={href} href={href} className={homeButtonClass}>
              {label}
            </Link>
          ))}
        </div>
      </Destination>
      <AboutSection showLink={false} />
      <AvpSection />
    </>
  );
}
