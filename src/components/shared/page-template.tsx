import Image from "next/image";
import Link from "next/link";

import { chapterUrl, siteConfig } from "@/lib/site-config";

type PageTemplateProps = {
  title: string;
  description: string;
};

export function PageTemplate({ title, description }: PageTemplateProps) {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-16 text-center sm:py-20">
      <Image src="/landing/origami-bird.svg" alt="" width={320.473} height={237.833} sizes="160px" className="mb-8 h-auto w-32 -scale-x-100 opacity-80 sm:w-40" />
      <p className="mb-4 rounded-full border border-[#b6a1dc]/20 bg-[#b6a1dc]/5 px-3 py-1 text-[0.625rem] font-medium tracking-[0.14em] text-[#b6a1dc] uppercase">{siteConfig.name}</p>
      <h1 className="max-w-full text-4xl leading-tight font-semibold tracking-[-0.025em] [overflow-wrap:anywhere] sm:text-5xl">{title}</h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-[#a39bb5]">{description}</p>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[#a39bb5]">You can find community updates on our official GDG chapter.</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#b6a1dc] px-5 py-2.5 text-sm font-medium text-[#090817] transition-colors hover:bg-[#d0bcef] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b6a1dc]">Back to home</Link>
        <a href={chapterUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#b6a1dc]/25 px-5 py-2.5 text-sm font-medium text-[#eeeaf7] transition-colors hover:border-[#b6a1dc]/60 hover:bg-[#b6a1dc]/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b6a1dc]">GDG Community <span className="ml-2" aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>
      </div>
    </section>
  );
}
