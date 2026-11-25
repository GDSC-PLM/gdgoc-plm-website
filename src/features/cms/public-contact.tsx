import { PageTemplate } from "@/components/shared/page-template";
import { CmsMarkdown } from "./cms-article";
import type { SiteSettings } from "./site-settings";

export function PublicContact({ settings }: { settings: SiteSettings }) {
  if (!settings.contactEmail && !settings.contactText) {
    return <PageTemplate title="Contact" description="This page is currently under development." />;
  }
  return <section className="mx-auto w-full max-w-3xl space-y-6 px-6 py-14 sm:px-10">
    <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Contact</h1>
    {settings.contactText && <CmsMarkdown source={settings.contactText} />}
    {settings.contactEmail && <a className="inline-flex min-h-11 items-center break-all underline underline-offset-4 focus-visible:outline-2"
      href={"mailto:" + settings.contactEmail}>{settings.contactEmail}</a>}
  </section>;
}
