import {
  HomeHero,
  AvpSection,
  AboutSection,
  FeaturedEvents,
  LatestBlogs,
} from "@/app/_home/introduction-sections";
import { ExecutiveBoardSection } from "@/app/_home/executive-board-section";
import {
  BoardArtwork,
  BoardFrame,
  GamesArtwork,
  PartnerOrbitArtwork,
  PartnersArtwork,
} from "@/app/_home/home-artwork";
import { GamesSection } from "@/app/_home/games-section";
import { PartnersSection } from "@/app/_home/partners-section";
import { siteConfig } from "@/lib/site-config";
import { organizationSchema, pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata(siteConfig.title, "/");

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema).replace(/</g, "\\u003c"),
        }}
      />
      <div>
        <HomeHero />
        <AvpSection />
        <AboutSection />
        <FeaturedEvents />
        <LatestBlogs />
        <GamesSection artwork={<GamesArtwork />} />
        <ExecutiveBoardSection
          artwork={<BoardArtwork />}
          frame={<BoardFrame />}
        />
        <PartnersSection
          artwork={<PartnersArtwork />}
          orbitArtwork={<PartnerOrbitArtwork />}
        />
      </div>
    </>
  );
}
