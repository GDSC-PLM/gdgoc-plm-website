import { Google_Sans_Flex } from "next/font/google";

export const landingFont = Google_Sans_Flex({
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
  adjustFontFallback: false,
  variable: "--font-landing",
});
