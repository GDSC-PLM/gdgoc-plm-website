import Link from "next/link";
import { LandingHero } from "@/app/_landing/landing-hero";
import { landingFont } from "@/app/fonts";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { publicPath } from "./public-routes";
import { publicFeatured } from "./server/public";
import type { CmsSnapshot } from "./server/schema";
import { siteSettings } from "./site-settings";

export async function PublicHome({ fields, preview }: { fields: CmsSnapshot["fields"]; preview?: boolean }) {
  const settings = siteSettings(fields);
  const configured = preview || Object.keys(fields).length > 0;
  const featured = await publicFeatured(fields.homeFeatured);
  return (
    <div className={landingFont.variable + " bg-[#090817] font-(family-name:--font-landing) text-[#eeeaf7]"}>
      {configured && <Navbar items={settings.navigation} />}
      <LandingHero className={landingFont.variable} settings={settings} preview={preview} />
      {featured.length > 0 && <section className="mx-auto max-w-6xl space-y-5 px-6 py-12 sm:px-10">
        <h2 className="text-2xl font-semibold">Featured content</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map(item => <li key={item.id} className="min-w-0">
            <Link prefetch={false} href={publicPath(item)} className="block rounded-lg border border-[#b6a1dc]/25 p-4 break-words underline underline-offset-4 hover:bg-[#b6a1dc]/10 focus-visible:outline-2">{item.title}</Link>
          </li>)}
        </ul>
      </section>}
      {configured && <Footer settings={settings} />}
    </div>
  );
}
