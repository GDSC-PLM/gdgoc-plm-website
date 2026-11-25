import type { Metadata } from "next";
import { connection } from "next/server";
import { PublicShell } from "@/components/shared/public-shell";
import { siteSettings } from "@/features/cms/site-settings";
import { publicSettings } from "@/features/cms/server/public";

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default async function PublicLayout({ children }: LayoutProps<"/">) {
  await connection();
  return <PublicShell settings={siteSettings(await publicSettings())}>{children}</PublicShell>;
}
