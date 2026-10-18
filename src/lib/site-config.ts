export type SocialPlatform = "facebook" | "instagram" | "tiktok" | "community";

export type SocialLink = {
  platform: SocialPlatform;
  label: string;
  href: string;
};

type SiteConfig = {
  url: string;
  name: string;
  organizationName: string;
  universityName: string;
  title: string;
  description: string;
  themeColor: string;
  logo: string;
  socialLinks: readonly SocialLink[];
};

export const siteConfig: SiteConfig = {
  url: "https://www.gdgocplm.org/",
  name: "GDGoC PLM",
  organizationName: "Google Developer Groups on Campus PLM",
  universityName: "Pamantasan ng Lungsod ng Maynila",
  title: "GDGoC PLM | Google Developer Groups on Campus PLM",
  description: "The official website of Google Developer Groups on Campus PLM at Pamantasan ng Lungsod ng Maynila. Connect, learn, and build with our community.",
  themeColor: "#090817",
  logo: "/brand/gdg-mark-512.png",
  socialLinks: [
    { platform: "facebook", label: "Facebook", href: "https://www.facebook.com/gdgplm" },
    { platform: "instagram", label: "Instagram", href: "https://www.instagram.com/gdg_plm" },
    { platform: "tiktok", label: "TikTok", href: "https://www.tiktok.com/@gdg_plm" },
    { platform: "community", label: "GDG Community", href: "https://gdg.community.dev/gdg-on-campus-pamantasan-ng-lungsod-ng-maynila-manila-philippines/" },
  ],
};

export const chapterUrl = siteConfig.socialLinks.find((link) => link.platform === "community")!.href;
