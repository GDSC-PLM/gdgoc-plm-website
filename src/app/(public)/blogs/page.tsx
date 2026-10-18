import { PageTemplate } from "@/components/shared/page-template";
import { siteConfig } from "@/lib/site-config";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata(
  `Blogs | ${siteConfig.name}`,
  "/blogs",
);

export default function BlogsPage() {
  return (
    <PageTemplate
      title="Blogs"
      description="This page is currently under development."
    />
  );
}
