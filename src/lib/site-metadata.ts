import "server-only";

import type { Metadata } from "next";

import { siteConfig } from "@/lib/site-config";

export const indexingEnabled = process.env.NODE_ENV === "production"
  && process.env.VERCEL_ENV !== "preview"
  && process.env.VERCEL_ENV !== "development";

export function pageMetadata(title: string, path: string, description: string = siteConfig.description): Metadata {
  const url = new URL(path, siteConfig.url).href;
  const images = [{
    url: new URL("/opengraph-image.png", siteConfig.url).href,
    width: 1200,
    height: 630,
    alt: "GDGoC PLM with the four-colored Google Developer Groups symbol",
  }];

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", locale: "en_PH", siteName: siteConfig.name, title, description, url, images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export const organizationSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteConfig.url}#organization`,
      name: siteConfig.organizationName,
      alternateName: siteConfig.name,
      url: siteConfig.url,
      description: siteConfig.description,
      logo: { "@type": "ImageObject", url: new URL(siteConfig.logo, siteConfig.url).href, width: 512, height: 512 },
      sameAs: siteConfig.socialLinks.filter((link) => link.href.trim()).map((link) => link.href),
    },
    {
      "@type": "WebSite",
      "@id": `${siteConfig.url}#website`,
      name: siteConfig.name,
      alternateName: siteConfig.organizationName,
      url: siteConfig.url,
      inLanguage: "en-PH",
      publisher: { "@id": `${siteConfig.url}#organization` },
    },
  ],
};
