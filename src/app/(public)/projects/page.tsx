import { PageTemplate } from "@/components/shared/page-template";
import { siteConfig } from "@/lib/site-config";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata(
  `Projects | ${siteConfig.name}`,
  "/projects",
);

export default function ProjectsPage() {
  return (
    <PageTemplate
      title="Projects"
      description="This page is currently under development."
    />
  );
}
