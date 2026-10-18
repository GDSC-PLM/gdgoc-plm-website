import { PageTemplate } from "@/components/shared/page-template";
import { siteConfig } from "@/lib/site-config";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata(
  `About | ${siteConfig.name}`,
  "/about",
);

export default function AboutPage() {
  return (
    <PageTemplate
      title="About"
      description="This page is currently under development."
    />
  );
}
