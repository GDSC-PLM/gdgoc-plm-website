import { PageTemplate } from "@/components/shared/page-template";
import { siteConfig } from "@/lib/site-config";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata(
  `Partners | ${siteConfig.name}`,
  "/partners",
);

export default function PartnersPage() {
  return (
    <PageTemplate
      title="Partners"
      description="This page is currently under development."
    />
  );
}
