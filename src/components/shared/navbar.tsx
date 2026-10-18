import Image from "next/image";
import Link from "next/link";

import { siteConfig } from "@/lib/site-config";

const navigationItems = [
  { href: "/about", label: "About" },
  { href: "/events", label: "Events" },
  { href: "/projects", label: "Projects" },
  { href: "/blogs", label: "Blogs" },
  { href: "/team", label: "Team" },
  { href: "/partners", label: "Partners" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  return (
    <header className="border-b border-[#b6a1dc]/10">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-4 px-6 py-5 sm:px-10"
      >
        <Link className="flex min-h-11 items-center gap-3 rounded-md font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b6a1dc]" href="/" aria-label={`${siteConfig.name} homepage`}>
          <Image src="/brand/gdg-mark.svg" alt="" width={128} height={128} className="size-12" />
          {siteConfig.name}
        </Link>
        <div className="flex flex-wrap gap-x-4 text-sm text-[#a39bb5]">
          {navigationItems.map((item) => (
            <Link key={item.href} href={item.href} className="inline-flex min-h-11 items-center rounded-sm transition-colors hover:text-[#eeeaf7] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b6a1dc]">
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
