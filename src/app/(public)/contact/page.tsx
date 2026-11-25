import { PublicContact } from "@/features/cms/public-contact";
import { publicSettings } from "@/features/cms/server/public";
import { siteSettings } from "@/features/cms/site-settings";
import { siteConfig } from "@/lib/site-config";
import { indexingEnabled, pageMetadata } from "@/lib/site-metadata";

export async function generateMetadata() {
  const settings = siteSettings(await publicSettings());
  return { ...pageMetadata(`Contact | ${siteConfig.name}`, "/contact"),
    robots: { index: indexingEnabled && Boolean(settings.contactText || settings.contactEmail), follow: indexingEnabled } };
}

export default async function ContactPage() {
  return <PublicContact settings={siteSettings(await publicSettings())} />;
}
