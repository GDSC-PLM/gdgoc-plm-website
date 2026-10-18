import { PageTemplate } from "@/components/shared/page-template";
import { siteConfig } from "@/lib/site-config";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata(
  `Team | ${siteConfig.name}`,
  "/team",
);

export default function TeamPage() {
  return (
    <PageTemplate
      title="Team"
      description="This page is currently under development."
    />
  );
}
