import { PageTemplate } from "@/components/shared/page-template";
import { siteConfig } from "@/lib/site-config";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata(
  `Contact | ${siteConfig.name}`,
  "/contact",
);

export default function ContactPage() {
  return (
    <PageTemplate
      title="Contact"
      description="This page is currently under development."
    />
  );
}
