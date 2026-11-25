import { landingConfig } from "@/app/_landing/landing-config";
import { siteConfig, type SocialLink } from "@/lib/site-config";
import type { CmsSnapshot } from "./server/schema";

export const defaultNavigation = [
  { href: "/about", label: "About" },
  { href: "/events", label: "Events" },
  { href: "/projects", label: "Projects" },
  { href: "/blogs", label: "Blogs" },
  { href: "/team", label: "Team" },
  { href: "/partners", label: "Partners" },
  { href: "/contact", label: "Contact" },
];

const defaultFooter = [
  { href: "/zines", label: "Zines" },
  { href: "/haribots", label: "Haribots" },
  { href: "/faq", label: "FAQ" },
  { href: "/games", label: "Games" },
];

export const defaultSettingsDraft: CmsSnapshot = {
  title: "Site settings", slug: "site-settings",
  fields: {
    headlineFirst: landingConfig.title[0], headlineSecond: landingConfig.title[1],
    homeDescription: landingConfig.description, homeStatus: landingConfig.status,
    navigation: defaultNavigation.map(({ label, href }) => [label, href, "show"]),
    footerLinks: defaultFooter.map(({ label, href }) => [label, href]),
    socials: siteConfig.socialLinks.map(({ platform, href }) => [platform, href]),
  },
};

export function siteSettings(fields: CmsSnapshot["fields"]) {
  const line = (key: string, fallback = "") => typeof fields[key] === "string" ? fields[key] : fallback;
  const rows = (key: string) => {
    const value = fields[key];
    return Array.isArray(value) ? value.filter((row): row is string[] =>
      Array.isArray(row) && row.every(part => typeof part === "string")) : null;
  };
  const socialRows = rows("socials");
  return {
    navigation: rows("navigation")?.filter(row => row[2] === "show").map(([label, href]) => ({ label, href })) ?? defaultNavigation,
    footerLinks: rows("footerLinks")?.map(([label, href]) => ({ label, href })) ?? defaultFooter,
    socials: socialRows ? socialRows.flatMap(([key, href]): SocialLink[] => {
      const link = siteConfig.socialLinks.find(item => item.platform === key);
      return link ? [{ ...link, href }] : [];
    }) : siteConfig.socialLinks,
    contactEmail: line("contactEmail"),
    contactText: line("contactText"),
    title: [line("headlineFirst", landingConfig.title[0]), line("headlineSecond", landingConfig.title[1])] as const,
    description: line("homeDescription", landingConfig.description),
    status: line("homeStatus", landingConfig.status),
  };
}

export type SiteSettings = ReturnType<typeof siteSettings>;
