# GDGoC PLM brand assets

`gdg-mark.svg` assembles the two original Figma logo halves without changing their paths, colors, or proportions. Keep the original exports in `public/landing/` intact. The square canvas supplies consistent transparent padding.

Run `pnpm brand:generate` from the repository root after editing the SVG. It uses the existing Next.js image renderer and Sharp dependency; no new runtime package is installed. Regeneration downloads Google Sans Flex's static 600-weight WOFF from Google Fonts to render the title. The image renderer does not support this font's variable TTF. The font is not copied into this folder; its [source and license](https://github.com/google/fonts/tree/main/ofl/googlesansflex) remain available from Google Fonts.

| Output | Use |
| --- | --- |
| `src/app/favicon.ico` | Transparent 16, 32, and 48px browser favicon frames |
| `src/app/icon.svg` | Resolution-independent browser icon |
| `src/app/apple-icon.png` | 180px opaque midnight Apple touch icon |
| `public/brand/icon-192.png` | 192px manifest icon |
| `public/brand/icon-512.png` | 512px manifest icon |
| `public/brand/gdg-mark-512.png` | Transparent 512px organization logo for structured data |
| `public/opengraph-image.png` | Static 1200 × 630 fallback social preview for Open Graph and Twitter |

Edit composition, typography and colors in `scripts/generate-brand-assets.mjs`. Update the fallback image alt text in `src/lib/site-metadata.ts` to match the image. The committed assets let builds and requests use the generated images directly.

These assets represent GDGoC PLM using its supplied GDG artwork; this repository does not claim ownership of Google's trademarks.
