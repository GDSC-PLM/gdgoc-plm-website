import Image from "next/image";
import Link from "next/link";

import { BirdSurprises } from "@/app/_landing/bird-surprises";
import { LandingBackdrop } from "@/app/_landing/landing-backdrop";
import { landingConfig } from "@/app/_landing/landing-config";
import { LandingExperience } from "@/app/_landing/landing-experience";
import { OrigamiBird } from "@/app/_landing/origami-bird";
import { cn } from "@/lib/utils";
import type { SocialPlatform } from "@/lib/site-config";
import type { SiteSettings } from "@/features/cms/site-settings";

type LandingHeroProps = {
  className: string;
  settings?: SiteSettings;
  preview?: boolean;
};

const socialIconPaths: Record<SocialPlatform, string> = {
  community: "M8.7 5.3 2 12l6.7 6.7 1.4-1.4L4.8 12l5.3-5.3-1.4-1.4Zm6.6 0-1.4 1.4 5.3 5.3-5.3 5.3 1.4 1.4L22 12l-6.7-6.7Z",
  facebook: "M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.095 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.026 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.972h-1.513c-1.491 0-1.956.931-1.956 1.887v2.263h3.328l-.532 3.49h-2.796V24C19.612 23.095 24 18.1 24 12.073Z",
  instagram: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849s-.012 3.584-.069 4.849c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.584-.012-4.849-.07c-3.26-.149-4.771-1.699-4.919-4.92-.058-1.264-.07-1.644-.07-4.848s.013-3.583.07-4.849C2.381 3.924 3.896 2.38 7.151 2.232 8.417 2.175 8.796 2.163 12 2.163ZM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24s3.668-.014 4.948-.072c4.354-.2 6.782-2.618 6.979-6.98C23.986 15.668 24 15.259 24 12s-.014-3.667-.072-4.947C23.728 2.699 21.31.273 16.948.073 15.668.014 15.259 0 12 0Zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324Zm0 10.162a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.406-11.845a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88Z",
  tiktok: "M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.9 2.9 0 0 1-5.2 1.743 2.9 2.9 0 0 1 2.31-4.64c.298 0 .594.045.878.134V9.39a6.33 6.33 0 0 0-.878-.063A6.337 6.337 0 1 0 15.82 15.6V8.615a8.18 8.18 0 0 0 4.774 1.526V6.717a4.8 4.8 0 0 1-1.005-.031Z",
};

const textEntrance = "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:fill-mode-backwards motion-safe:duration-400 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)] motion-safe:group-data-[entered=true]/sky:animate-none";
const headlineDelays = ["motion-safe:delay-320", "motion-safe:delay-390"] as const;

export function LandingHero({ className, settings, preview }: LandingHeroProps) {
  const { assets, brand, campus, counter, followLabel, organization, program } = landingConfig;
  const { title, status, description } = settings ?? landingConfig;
  const socialLinks = settings?.socials ?? landingConfig.socialLinks;
  const socialIconClass = "grid size-11 place-items-center rounded-full text-(--muted-lavender)";

  return (
    <div
      className={cn(
        "relative isolate h-dvh min-h-dvh w-full flex-none overflow-x-clip overflow-y-auto bg-(--midnight) font-(family-name:--font-landing) text-(--white)",
        // Colors.
        "[--midnight:#090817] [--indigo:#14112b] [--white:#eeeaf7] [--muted-lavender:#a39bb5] [--lavender:#b6a1dc] [--star-yellow:#e9cb80]",
        // Spacing and sizes: the desktop reference is 1440 × 686.
        "[--brand-width:clamp(10rem,16.667vw,17rem)] [--page-x:clamp(1.25rem,4.44vw,5rem)] [--page-top:clamp(1.5rem,5dvh,3rem)]",
        "[--bird-width:min(clamp(11rem,min(19.445vw,40.82dvh),20rem),calc(100vw-2.5rem))] [--bird-height:calc(var(--bird-width)*0.77467)]",
        "[--heading-size:clamp(2rem,min(3.889vw,8.164dvh),4rem)] [--count-size:0.875rem] [--number-size:1rem] [--description-size:clamp(1rem,1.25vw,1.25rem)]",
        "[--bird-copy-gap:0.75rem] [--eyebrow-gap:0.375rem] [--description-gap:1rem]",
        "max-md:[--brand-width:clamp(12rem,56vw,14rem)] max-md:[--bird-width:min(clamp(10rem,min(53vw,29dvh),14rem),calc(100vw-2.5rem))] max-md:[--heading-size:clamp(1.75rem,8.2vw,3rem)]",
        "[@media(max-height:450px)]:[--page-top:1rem] [@media(max-height:450px)]:[--bird-width:clamp(5rem,26dvh,7rem)] [@media(max-height:450px)]:[--heading-size:clamp(1.5rem,6.4dvh,2rem)] [@media(max-height:450px)]:[--description-gap:0.5rem]",
        className,
      )}
      data-landing
    >
      <LandingExperience
        preview={preview}
        labels={counter}
        backdrop={<LandingBackdrop />}
        bird={<OrigamiBird />}
        surprises={<BirdSurprises />}
        hintArtwork={<Image {...assets.hintLabel} alt="" sizes="160px" className="block h-auto w-40 max-w-full select-none" />}
        branding={
          <Link
            href="/"
            aria-label={`${brand} homepage`}
            className="flex w-[calc(var(--brand-width)*0.9237)] max-w-full min-w-0 items-center gap-[calc(var(--brand-width)*0.03667)] rounded max-md:w-(--brand-width) focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-(--star-yellow)"
          >
            <span className="relative aspect-[91.57/52] w-[calc(var(--brand-width)*0.22892)] shrink-0" aria-hidden="true">
              <Image {...assets.logoLeft} alt="" className="absolute top-[6.42%] left-0 h-auto w-[48.116%] rotate-180" loading="eager" />
              <Image {...assets.logoRight} alt="" className="absolute top-0 right-0 h-auto w-[48.116%]" loading="eager" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-[calc(var(--brand-width)*0.00667)] [overflow-wrap:anywhere]">
              <span className="text-[length:calc(var(--brand-width)*0.05333)] leading-[0.97915] font-semibold tracking-[-0.04em]">
                {organization}
              </span>
              <span className="w-max max-w-[calc(100vw-var(--page-x)*2-var(--brand-width)*0.26559)] text-[length:calc(var(--brand-width)*0.03)] leading-[1.234] font-medium tracking-[-0.04em]">
                <span className="text-[#508df3]">{program}</span>
                {" • "}
                {campus}
              </span>
            </span>
          </Link>
        }
        socials={
          <div className="flex max-w-full flex-wrap items-center justify-center gap-x-2 md:justify-end" data-landing-socials>
            {socialLinks.length > 0 && <p className="text-xs leading-normal text-(--muted-lavender)">{followLabel}</p>}
            <ul className="flex max-w-full flex-wrap items-center justify-end" aria-label="Social media">
              {socialLinks.map(({ platform, label, href }) => {
                const icon = (
                  <svg viewBox={platform === "tiktok" ? "3 1 19 22" : "0 0 24 24"} className="size-4" fill="currentColor" aria-hidden="true">
                    <path d={socialIconPaths[platform]} />
                  </svg>
                );

                return (
                  <li key={platform}>
                    {href.trim() ? (
                      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={cn(socialIconClass, "hover:text-(--white) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--star-yellow)")}>
                        {icon}
                      </a>
                    ) : (
                      <span role="link" aria-disabled="true" aria-label={label} className={socialIconClass}>
                        {icon}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        }
        copy={
          <>
            {status && <p className={cn("mt-(--bird-copy-gap) mb-(--eyebrow-gap) rounded-full border border-(--lavender)/20 bg-(--lavender)/5 px-3 py-1 text-[0.625rem] leading-normal font-medium tracking-[0.14em] text-(--lavender) uppercase", textEntrance, "motion-safe:delay-250")}>{status}</p>}
            <h1 id="landing-title" className="max-w-full text-(length:--heading-size) leading-[1.12] font-semibold tracking-[-0.025em] [overflow-wrap:anywhere]">
              {title.map((line, index) => <span className={cn("block", textEntrance, headlineDelays[index])} key={index}>{line}</span>)}
            </h1>
            <p className={cn("mt-(--description-gap) max-w-[28rem] text-(length:--description-size) leading-relaxed text-balance text-(--muted-lavender)", textEntrance, "motion-safe:delay-460")}>
              {description}
            </p>
          </>
        }
      />
    </div>
  );
}
