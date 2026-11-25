import Image from "next/image";
import type { ReactNode } from "react";
import type { SiteSettings } from "@/features/cms/site-settings";

import { landingFont } from "@/app/fonts";
import { Footer } from "@/components/shared/footer";
import { Navbar } from "@/components/shared/navbar";
import { landingConfig } from "@/app/_landing/landing-config";

export function PublicShell({ children, settings, preview }: { children: ReactNode; settings: SiteSettings; preview?: boolean }) {
  const { assets } = landingConfig;
  const Content = preview ? "div" : "main";

  return (
    <div className={`${landingFont.variable} relative isolate flex min-h-dvh flex-1 flex-col overflow-x-clip bg-[#090817] font-(family-name:--font-landing) text-[#eeeaf7] selection:bg-[#b6a1dc]/25`}>
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,#14112b,transparent_70%)]" />
        <Image {...assets.starField} alt="" className="absolute top-0 left-0 h-auto min-w-200 opacity-20" />
        <Image {...assets.cloudFrontLeft} alt="" sizes="50vw" className="absolute -bottom-6 -left-12 h-auto w-[55%] min-w-80 -scale-x-100 opacity-20" />
        <Image {...assets.cloudFrontRight} alt="" sizes="50vw" className="absolute -right-12 -bottom-6 h-auto w-[50%] min-w-72 opacity-20" />
      </div>
      <a href="#page-content" className="sr-only rounded-md bg-[#eeeaf7] px-4 py-3 text-[#090817] focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-20">Skip to content</a>
      <Navbar items={settings.navigation} />
      <Content id="page-content" className="flex min-w-0 flex-1" tabIndex={-1}>{children}</Content>
      <Footer settings={settings} />
    </div>
  );
}
