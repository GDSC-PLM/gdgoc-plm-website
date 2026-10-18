import Image from "next/image";

import { landingConfig } from "@/app/_landing/landing-config";
import { LandingConstellations } from "@/app/_landing/landing-constellations";
import { cn } from "@/lib/utils";

const stars = [
  { position: "top-[31%] left-[22%] w-4", shine: "motion-safe:group-data-[star=0]/sky:opacity-65" },
  { position: "top-[63%] left-[81%] w-4", shine: "motion-safe:group-data-[star=1]/sky:opacity-60" },
  { position: "top-[22%] left-[71%] w-2.5", shine: "motion-safe:group-data-[star=2]/sky:opacity-55" },
  { position: "top-[74%] left-[35%] w-2", shine: "motion-safe:group-data-[star=3]/sky:opacity-50" },
] as const;

const meteorTracks = [
  {
    position: "-top-[12%] left-[36%] max-md:top-[8%] max-md:left-[75%]",
    lane: "motion-safe:group-data-[meteor-lane=0]/sky:block",
    movementDelay: "motion-safe:group-data-[flight=on]/sky:delay-0",
    revealDelay: "motion-safe:delay-0",
  },
  {
    position: "-top-[7%] left-[74%] max-md:top-[24%] max-md:left-[110%]",
    lane: "motion-safe:group-data-[meteor-lane=1]/sky:block",
    movementDelay: "motion-safe:group-data-[flight=on]/sky:delay-90",
    revealDelay: "motion-safe:delay-90",
  },
  {
    position: "top-[5%] left-[108%] max-md:top-[44%] max-md:left-[105%]",
    lane: "motion-safe:group-data-[meteor-lane=2]/sky:block",
    movementDelay: "motion-safe:group-data-[flight=on]/sky:delay-180",
    revealDelay: "motion-safe:delay-180",
  },
  {
    position: "-top-[20%] left-[55%]",
    lane: "",
    movementDelay: "motion-safe:group-data-[flight=on]/sky:delay-270",
    revealDelay: "motion-safe:delay-270",
  },
  {
    position: "top-[16%] left-[94%]",
    lane: "",
    movementDelay: "motion-safe:group-data-[flight=on]/sky:delay-360",
    revealDelay: "motion-safe:delay-360",
  },
  {
    position: "top-[3%] left-[122%]",
    lane: "",
    movementDelay: "motion-safe:group-data-[flight=on]/sky:delay-450",
    revealDelay: "motion-safe:delay-450",
  },
] as const;

export function LandingBackdrop() {
  const { assets } = landingConfig;
  const cloudEntrance = "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-8 motion-safe:fill-mode-backwards motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)] motion-safe:group-data-[entered=true]/sky:animate-none";

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" data-landing-backdrop>
      {/* A smaller mobile scene keeps the cloud crests inside the viewport. */}
      <div className="absolute inset-y-0 left-1/2 w-full min-w-160 -translate-x-1/2 [container-type:inline-size] md:min-w-225 [&_img]:absolute [&_img]:h-auto [&_img]:max-w-none">
        <Image {...assets.starField} alt="" className="top-0 left-0 w-full opacity-30" />
        <Image {...assets.cloudFrontLeft} alt="" className={cn("-bottom-[5cqw] -left-[8%] w-[49%] -scale-x-100 opacity-25 max-md:-bottom-2 max-md:opacity-30 motion-safe:duration-800 motion-safe:delay-100", cloudEntrance)} data-sky-cloud="left" />
        <Image {...assets.cloudFrontRight} alt="" className={cn("-right-[8%] -bottom-[5cqw] w-[44%] opacity-25 max-md:-bottom-2 max-md:opacity-30 motion-safe:duration-800 motion-safe:delay-240", cloudEntrance)} data-sky-cloud="right" />
        <Image {...assets.cloudCenter} alt="" className={cn("-bottom-[1.2cqw] left-[32%] w-[42%] -scale-x-100 opacity-15 max-md:bottom-0 max-md:opacity-25 motion-safe:duration-700 motion-safe:delay-380", cloudEntrance)} data-sky-cloud="center" />
      </div>

      {stars.map(({ position, shine }, index) => (
        <Image
          {...(index % 2 === 0 ? assets.starWhite : assets.starYellow)}
          alt=""
          className={cn("absolute h-auto opacity-20 motion-safe:transition-opacity motion-safe:duration-1400 group-data-[motion=off]/sky:transition-none motion-safe:ease-in-out", position, shine)}
          data-sky-star={index}
          key={index}
        />
      ))}

      <LandingConstellations />

      <Image {...assets.spaceGlowLeft} alt="" loading="eager" data-sky-glow="left" className="absolute top-[10%] -left-[21%] h-auto w-[min(65vw,50rem)] -translate-x-4 opacity-0 motion-safe:transition-[opacity,translate] group-data-[motion=off]/sky:transition-none motion-safe:duration-1100 motion-safe:ease-out motion-safe:group-data-[glow=on]/sky:translate-x-0 motion-safe:group-data-[glow=on]/sky:opacity-35 motion-safe:group-data-[glow=on]/sky:duration-450 max-md:-left-[50%] max-md:w-[110%]" />
      <Image {...assets.spaceGlowRight} alt="" loading="eager" data-sky-glow="right" className="absolute top-[7%] -right-[21%] h-auto w-[min(65vw,50rem)] translate-x-4 opacity-0 motion-safe:transition-[opacity,translate] group-data-[motion=off]/sky:transition-none motion-safe:duration-1100 motion-safe:ease-out motion-safe:group-data-[glow=on]/sky:translate-x-0 motion-safe:group-data-[glow=on]/sky:opacity-35 motion-safe:group-data-[glow=on]/sky:duration-450 max-md:-right-[50%] max-md:w-[110%]" />

      {meteorTracks.map(({ position, lane, movementDelay, revealDelay }, index) => (
        <div className={cn("absolute w-[clamp(5rem,10vw,9rem)]", position, index > 2 && "hidden md:block")} key={index}>
          <div
            className={cn(
              "hidden translate-x-0 translate-y-0 [--meteor-x:-40vw] [--meteor-y:65dvh] max-md:[--meteor-x:calc(-1*max(70vw,50dvh))] max-md:[--meteor-y:calc(max(70vw,50dvh)*0.85)] motion-safe:group-data-[sky=shower]/sky:block motion-safe:group-data-[flight=on]/sky:translate-x-(--meteor-x) motion-safe:group-data-[flight=on]/sky:translate-y-(--meteor-y) motion-safe:group-data-[flight=on]/sky:transition-transform motion-safe:group-data-[flight=on]/sky:duration-1150 motion-safe:group-data-[flight=on]/sky:ease-linear",
              lane,
              movementDelay,
            )}
            data-sky-meteor={index}
          >
            <Image
              {...assets.meteor}
              alt=""
              loading="eager"
              className={cn("block h-auto w-full opacity-0 motion-safe:transition-opacity motion-safe:duration-550 motion-safe:ease-out motion-safe:group-data-[meteors-visible=true]/sky:opacity-70 motion-safe:group-data-[meteors-visible=true]/sky:duration-180", revealDelay)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
