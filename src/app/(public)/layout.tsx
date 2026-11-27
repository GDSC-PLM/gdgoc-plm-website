import type { ReactNode } from "react";
import { landingFont, homeBodyFont, homeStatFont } from "@/app/fonts";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={[
        landingFont.variable,
        homeBodyFont.variable,
        homeStatFont.variable,
        "min-h-dvh [overflow-wrap:anywhere] bg-[#090817] font-(family-name:--font-home-body) text-[#eeeaf7] selection:bg-[#b6a1dc]/25 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-4 [&_a:focus-visible]:outline-[#fbe29b] [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-4 [&_button:focus-visible]:outline-[#fbe29b]",
      ].join(" ")}
    >
      <a
        href="#page-content"
        className="sr-only fixed top-3 left-3 z-60 rounded bg-white px-4 py-3 text-black focus:not-sr-only"
      >
        Skip to content
      </a>
      <Navbar />
      <main
        id="page-content"
        tabIndex={-1}
        className="min-w-0 outline-none [&_section[id]]:scroll-mt-20"
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}
