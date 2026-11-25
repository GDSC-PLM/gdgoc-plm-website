import { siteConfig } from "@/lib/site-config";
import type { SiteSettings } from "@/features/cms/site-settings";

export function Footer({ settings }: { settings: SiteSettings }) {
  const linkClass = "inline-flex min-h-11 items-center rounded-sm transition-colors hover:text-[#eeeaf7] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b6a1dc]";
  return (
    <footer className="border-t border-[#b6a1dc]/10 px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-xs leading-relaxed text-[#a39bb5]">
      {settings.footerLinks.length > 0 && <nav aria-label="Footer links" className="flex flex-wrap justify-center gap-x-5">
        {settings.footerLinks.map(({ label, href }) => <a key={href} href={href} className={linkClass}>{label}</a>)}
      </nav>}
      {settings.socials.length > 0 && <nav aria-label="Community links" className="mb-3 flex flex-wrap justify-center gap-x-5">
        {settings.socials.map(({ label, href, platform }) => href.trim() ? (
          <a key={platform} href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>{label}<span className="sr-only"> (opens in a new tab)</span></a>
        ) : null)}
      </nav>}
      <p>{siteConfig.organizationName}</p>
      <p>{siteConfig.universityName}</p>
      {settings.contactEmail && <a className={linkClass + " break-all"} href={"mailto:" + settings.contactEmail}>{settings.contactEmail}</a>}
    </footer>
  );
}
