import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { siteConfig } from "@/lib/site-config";
import { indexingEnabled, pageMetadata } from "@/lib/site-metadata";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  ...pageMetadata(siteConfig.title, "/"),
  // Canonicals belong to individual pages, not the shared error/layout fallback.
  alternates: undefined,
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  robots: { index: indexingEnabled, follow: indexingEnabled, googleBot: { index: indexingEnabled, follow: indexingEnabled, "max-image-preview": "large" } },
};

export const viewport: Viewport = { themeColor: siteConfig.themeColor };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-PH"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
