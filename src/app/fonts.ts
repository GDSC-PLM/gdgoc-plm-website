import { Google_Sans_Flex, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";

export const landingFont = Google_Sans_Flex({
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
  adjustFontFallback: false,
  variable: "--font-landing",
});

export const homeBodyFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-home-body",
});

export const homeStatFont = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-home-stat",
});
