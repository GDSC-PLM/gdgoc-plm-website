import { connection } from "next/server";
import { publicSettings } from "@/features/cms/server/public";
import { PublicHome } from "@/features/cms/public-home";
import { siteSettings } from "@/features/cms/site-settings";
import { siteConfig } from "@/lib/site-config";
import { organizationSchema, pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata(siteConfig.title, "/");

export default async function HomePage() {
  await connection();
  const fields = await publicSettings();
  const [organization, website] = organizationSchema["@graph"];
  const schema = { ...organizationSchema, "@graph": [
    { ...organization, sameAs: siteSettings(fields).socials.map(item => item.href) }, website,
  ] };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
      <PublicHome fields={fields} />
    </>
  );
}
