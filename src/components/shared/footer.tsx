import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import { contactEmail } from "@/content/public-content";
export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-[#0d0b20]">
      <div
        className="relative h-20 overflow-hidden bg-linear-to-r from-blue-500/10 via-violet-400/15 to-amber-300/10"
        aria-hidden="true"
      >
        <Image
          src="/home/footer/imgSubtleTopGlowLine.svg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
        />
      </div>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-5 py-14 sm:px-8 md:grid-cols-3">
        <div>
          <Link
            href="/"
            className="flex items-center gap-3 text-lg font-semibold"
          >
            <Image src="/brand/gdg-mark.svg" alt="" width={40} height={40} />
            GDGoC PLM
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#a39bb5]">
            Empowering student builders and innovators at Pamantasan ng Lungsod
            ng Maynila where curiosity meets code.
          </p>
        </div>
        <nav aria-label="Footer navigation">
          <p className="mb-4 text-xs tracking-widest text-[#a39bb5]">
            NAVIGATION
          </p>
          <div className="flex flex-wrap gap-5">
            {["About", "Events", "Blogs", "Games"].map((label) => (
              <Link
                key={label}
                href={label === "Games" ? "/#games" : "/" + label.toLowerCase()}
                className="py-2 text-sm hover:text-[#b6a1dc]"
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>
        <div>
          <p className="mb-4 text-xs tracking-widest text-[#a39bb5]">
            CONNECT WITH US
          </p>
          <a
            className="inline-flex min-h-11 max-w-full items-center rounded-full border border-white/15 px-4 text-sm break-all"
            href={"mailto:" + contactEmail}
          >
            {contactEmail}
          </a>
          <div className="mt-4 flex flex-wrap gap-4">
            {siteConfig.socialLinks.map((s) => (
              <a
                key={s.platform}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 text-xs text-[#b5accb]"
              >
                {s.label}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-3 border-t border-white/10 px-5 py-6 text-xs text-[#a39bb5]">
        <p>© 2026 GDGoC PLM</p>
        <p>
          Google Developer Groups on Campus · Pamantasan ng Lungsod ng Maynila
        </p>
      </div>
    </footer>
  );
}
