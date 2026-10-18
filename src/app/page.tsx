import { LandingHero } from "@/app/_landing/landing-hero";
import { landingFont } from "@/app/fonts";
import { siteConfig } from "@/lib/site-config";
import { organizationSchema, pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata(siteConfig.title, "/");

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema).replace(/</g, "\\u003c") }} />
      <LandingHero className={landingFont.variable} />
    </>
  );
}
