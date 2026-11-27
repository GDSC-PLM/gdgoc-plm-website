"use client";

import { animate, type AnimationSequence } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

import { homeButtonClass, homeHeadingClass } from "@/app/_home/home-config";

function PartnerOrbit({ artwork }: { artwork: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = scope.current;
    const viewport = viewportRef.current;
    if (!root || !viewport) return;

    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let playback: ReturnType<typeof animate> | null = null;
    let disposed = false;
    let loading = false;
    async function initialize(): Promise<void> {
      if (loading || preference.matches) return;
      loading = true;
      try {
        const { partnerMotion } = await import("@/app/_home/partner-motion");
        if (disposed) return;
        const sequence: AnimationSequence = [];
        for (const track of partnerMotion) {
          const element = root!.querySelector<HTMLElement>(
            `[data-node-id="${track.id}"]`,
          );
          if (!element)
            throw new Error(`Missing Figma partner node ${track.id}`);
          element.style.setProperty("--motion-translate-x", "0");
          element.style.setProperty("--motion-translate-y", "0");
          element.style.transformOrigin = track.origin;
          sequence.push([
            element,
            {
              "--motion-translate-x": track.x,
              "--motion-translate-y": track.y,
            },
            {
              at: 0,
              duration: track.duration,
              ease: track.ease,
              "--motion-translate-x": { times: track.xTimes, ease: track.ease },
              "--motion-translate-y": { times: track.yTimes, ease: track.ease },
            },
          ]);
        }

        playback = animate(sequence, { repeat: Infinity, autoplay: false });
        syncPlayback();
      } catch {
        loading = false;
      }
    }
    let inView = false;

    const syncPlayback = (): void => {
      if (!playback) {
        root.dataset.orbitState = preference.matches ? "reduced" : "paused";
        if (inView && !preference.matches) void initialize();
        return;
      }
      if (preference.matches) {
        playback.pause();
        playback.time = 0;
        root.dataset.orbitState = "reduced";
      } else if (inView && !document.hidden) {
        playback.play();
        root.dataset.orbitState = "running";
      } else {
        playback.pause();
        root.dataset.orbitState = "paused";
      }
    };

    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncPlayback();
    });
    observer.observe(viewport);
    const preloadObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void initialize();
      },
      { rootMargin: "400px" },
    );
    preloadObserver.observe(viewport);
    document.addEventListener("visibilitychange", syncPlayback);
    preference.addEventListener("change", syncPlayback);
    syncPlayback();

    return () => {
      observer.disconnect();
      preloadObserver.disconnect();
      document.removeEventListener("visibilitychange", syncPlayback);
      preference.removeEventListener("change", syncPlayback);
      disposed = true;
      playback?.cancel();
    };
  }, []);

  return (
    <div
      ref={scope}
      className="relative h-[clamp(340px,60dvh,720px)] min-h-[340px] w-full flex-1 overflow-hidden [container-type:size]"
      data-partner-orbit
    >
      <div
        ref={viewportRef}
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_80%,transparent)]"
        aria-hidden="true"
      >
        <div className="absolute bottom-0 left-1/2 h-[612px] w-[1440px] origin-bottom -translate-x-1/2 scale-[max(calc(100cqw/1440px),calc(100cqh/612px))] select-none">
          <div className="relative h-[1962px] w-[1440px] -translate-y-[1350px]">
            {artwork}
          </div>
        </div>
      </div>
      <p className="absolute bottom-[10%] left-1/2 -translate-x-1/2 text-center">
        <span className="block font-(family-name:--font-home-stat) text-4xl leading-none font-semibold text-[#eeeaf7] sm:text-5xl">
          50+
        </span>
        <span className="mt-2 block text-xs font-semibold tracking-[0.06em] whitespace-nowrap text-[#c9b6f5] sm:text-sm">
          CAMPUS PARTNERS
        </span>
      </p>
    </div>
  );
}

export function PartnersSection({
  artwork,
  orbitArtwork,
}: {
  artwork: ReactNode;
  orbitArtwork: ReactNode;
}) {
  return (
    <section
      id="partners"
      aria-labelledby="partners-title"
      className="relative isolate flex min-h-dvh w-full flex-col overflow-x-clip overflow-y-auto bg-[#090817] font-(family-name:--font-home-body) text-[#eeeaf7]"
      data-home-section="partners"
    >
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden opacity-35 select-none [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_70%,transparent)]"
        aria-hidden="true"
      >
        <div className="absolute top-1/2 left-1/2 h-[1962px] w-[1440px] -translate-1/2 scale-[max(calc(100vw/1440px),calc(100dvh/1962px))]">
          {artwork}
        </div>
      </div>
      <div className="relative z-10 mx-auto flex w-full max-w-6xl shrink-0 flex-col items-center px-5 pt-[clamp(1.5rem,5dvh,3rem)] text-center sm:px-8">
        <p className="max-w-2xl text-xs leading-relaxed text-[#9c91b3] sm:text-sm">
          Meaningful initiatives take more than one team to launch.
        </p>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-[#b5accb] sm:text-lg">
          We owe it to our{" "}
          <strong className="font-semibold text-[#d7d0e4]">partners</strong> who
          help power our events, projects, and learning spaces
        </p>
        <h2 id="partners-title" className={`${homeHeadingClass} mt-6`}>
          Expanding our orbit
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#b5accb] sm:text-base">
          The companies, student communities, and organizations building with us
        </p>
        <button
          type="button"
          disabled
          className={`${homeButtonClass} mt-5 w-full max-w-[240px] cursor-default hover:bg-[#b6a1dc]`}
        >
          View Leaderboard
        </button>
      </div>
      <PartnerOrbit artwork={orbitArtwork} />
    </section>
  );
}
