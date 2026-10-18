import { siteConfig, type SocialLink } from "@/lib/site-config";

type LandingAsset = {
  src: `/landing/${string}`;
  width: number;
  height: number;
  alt: string;
};

type LandingConfig = {
  brand: string;
  organization: string;
  program: string;
  campus: string;
  status: string;
  title: readonly [string, string];
  description: string;
  followLabel: string;
  socialLinks: readonly SocialLink[];
  counter: {
    count: string;
    hint: string;
    button: string;
    loading: string;
    unavailable: string;
    failed: string;
    throttled: string;
    storage: string;
    blocked: string;
    attention: string;
    hello: string;
    retry: string;
  };
  assets: Record<
    | "logoLeft" | "logoRight" | "bird" | "hintLabel" | "starField" | "spaceGlowLeft" | "spaceGlowRight"
    | "starLarge" | "starEdgeLeft" | "starEdgeRight" | "starWhite"
    | "starSmall" | "starYellow" | "glowTop" | "glowBottom"
    | "meteorField" | "meteorsTop" | "meteor" | "dotBottom" | "dotTrail1"
    | "dotTrail2" | "dotTrail3" | "dotTrail4" | "cloudBackLeft"
    | "cloudBackRight" | "cloudFrontLeft" | "cloudFrontRight" | "cloudCenter",
    LandingAsset
  >;
};

export const landingConfig: LandingConfig = {
  brand: siteConfig.name,
  organization: "Google Developer Groups",
  program: "On Campus",
  campus: siteConfig.universityName,
  status: "Stay tuned",
  title: ["Something", "Stellar is cooking."],
  description: "The next chapter of GDGoC PLM is on its way.",
  followLabel: "Follow us on",
  socialLinks: siteConfig.socialLinks,
  counter: {
    count: "sparks and counting",
    hint: "try clicking me!",
    button: "Add a spark",
    loading: "Loading community sparks",
    unavailable: "Counter temporarily unavailable",
    failed: "Connection interrupted. Your saved sparks will be retried.",
    throttled: "Give your sparks a moment to save.",
    storage: "Unable to save sparks on this device. Check browser storage, then try again.",
    blocked: "Your sparks are saved here, but couldn't be sent. Please try again.",
    attention: "okay, you have my attention.",
    hello: "hello, world.",
    retry: "Try again",
  },
  // These are the original SVG dimensions, including any filter padding.
  assets: {
    logoLeft: { src: "/landing/gdg-logo-left.svg", width: 44.06, height: 48.661, alt: "" },
    logoRight: { src: "/landing/gdg-logo-right.svg", width: 44.06, height: 48.661, alt: "" },
    bird: { src: "/landing/origami-bird.svg", width: 320.473, height: 237.833, alt: "Purple origami bird" },
    hintLabel: { src: "/landing/try-clicking-me.png", width: 2172, height: 724, alt: "" },
    starField: { src: "/landing/star-field.svg", width: 1431.47, height: 687, alt: "" },
    spaceGlowLeft: { src: "/landing/space-glow-left.svg", width: 671.115, height: 761, alt: "" },
    spaceGlowRight: { src: "/landing/space-glow-right.svg", width: 725.803, height: 820.307, alt: "" },
    starLarge: { src: "/landing/star-large.svg", width: 84, height: 84, alt: "" },
    starEdgeLeft: { src: "/landing/star-edge-left.svg", width: 84, height: 84, alt: "" },
    starEdgeRight: { src: "/landing/star-edge-right.svg", width: 84, height: 84, alt: "" },
    starWhite: { src: "/landing/star-white.svg", width: 48, height: 48, alt: "" },
    starSmall: { src: "/landing/star-small.svg", width: 36, height: 36, alt: "" },
    starYellow: { src: "/landing/star-yellow.svg", width: 48, height: 48, alt: "" },
    glowTop: { src: "/landing/glow-top.svg", width: 582.8, height: 614.8, alt: "" },
    glowBottom: { src: "/landing/glow-bottom.svg", width: 454.04, height: 468.8, alt: "" },
    meteorField: { src: "/landing/meteor-field.svg", width: 1043.41, height: 1134.38, alt: "" },
    meteorsTop: { src: "/landing/meteors-top.svg", width: 677.014, height: 243.608, alt: "" },
    meteor: { src: "/landing/meteor.svg", width: 125.863, height: 111.888, alt: "" },
    dotBottom: { src: "/landing/dot-bottom.svg", width: 10, height: 10, alt: "" },
    dotTrail1: { src: "/landing/dot-trail-1.svg", width: 9, height: 9, alt: "" },
    dotTrail2: { src: "/landing/dot-trail-2.svg", width: 6, height: 6, alt: "" },
    dotTrail3: { src: "/landing/dot-trail-3.svg", width: 8, height: 8, alt: "" },
    dotTrail4: { src: "/landing/dot-trail-4.svg", width: 5, height: 5, alt: "" },
    cloudBackLeft: { src: "/landing/cloud-back-left.svg", width: 589.1, height: 83.9412, alt: "" },
    cloudBackRight: { src: "/landing/cloud-back-right.svg", width: 589.392, height: 103.862, alt: "" },
    cloudFrontLeft: { src: "/landing/cloud-front-left.svg", width: 701.974, height: 198.81, alt: "" },
    cloudFrontRight: { src: "/landing/cloud-front-right.svg", width: 594.734, height: 203.372, alt: "" },
    cloudCenter: { src: "/landing/cloud-center.svg", width: 530.645, height: 44, alt: "" },
  },
};
