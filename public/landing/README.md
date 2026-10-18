# Landing page artwork

These 26 SVG assets come from the [1440 × 686 Figma landing frame, node `3423:596`](https://www.figma.com/design/cTvyBCARuUkpTbJCSwaiKJ/GDGoC---PLM-Official-Website?node-id=3423-596). The logo follows group `3423:644`: two original SVG halves form its vector mark, with an editable Google Sans Flex wordmark beside it. Change the wordmark through `organization` and `program` in `src/app/_landing/landing-config.ts`; the campus name comes from `universityName` in `src/lib/site-config.ts`.

The [brand asset guide](../brand/README.md) covers the assembled logo, favicon/icon sizes, and minimal share image. Those files are derived from these original logo halves; the homepage keeps its existing artwork and layout. Official names, search metadata, and social/profile URLs live in `src/lib/site-config.ts`, separate from visible hero copy.

The homepage keeps a faint star field and three low-opacity clouds. Four accent-star instances twinkle one at a time. The original `space-glow-left.svg` and `space-glow-right.svg` appear during the fifth-tap reward. Six desktop meteor tracks (three on phones) reuse `meteor.svg`; the browser requests that asset once. Other unused exports stay intact. The bird is inline JSX in `src/app/_landing/origami-bird.tsx`, copied from the original export so its wings, head, and tail can move independently; `origami-bird.svg` remains the source reference.

Dimensions below are each file's original SVG `width` and `height`. Some glow assets include extra space for their blur filters; keep those dimensions rather than trimming to the visible shape.

| Local file | Original dimensions |
| --- | --- |
| `gdg-logo-left.svg` | 44.0595 × 48.661 |
| `gdg-logo-right.svg` | 44.0595 × 48.661 |
| `origami-bird.svg` | 320.473 × 237.833 |
| `star-field.svg` | 1431.47 × 687 |
| `space-glow-left.svg` | 671.115 × 761 |
| `space-glow-right.svg` | 725.803 × 820.307 |
| `star-large.svg` | 84 × 84 |
| `star-edge-left.svg` | 84 × 84 |
| `star-edge-right.svg` | 84 × 84 |
| `star-white.svg` | 48 × 48 |
| `star-small.svg` | 36 × 36 |
| `star-yellow.svg` | 48 × 48 |
| `glow-top.svg` | 582.8 × 614.8 |
| `glow-bottom.svg` | 454.04 × 468.8 |
| `meteor-field.svg` | 1043.41 × 1134.38 |
| `meteors-top.svg` | 677.014 × 243.608 |
| `meteor.svg` (derived head/trail pair) | 125.863 × 111.888 |
| `dot-bottom.svg` | 10 × 10 |
| `dot-trail-1.svg` | 9 × 9 |
| `dot-trail-2.svg` | 6 × 6 |
| `dot-trail-3.svg` | 8 × 8 |
| `dot-trail-4.svg` | 5 × 5 |
| `cloud-back-left.svg` | 589.1 × 83.9412 |
| `cloud-back-right.svg` | 589.392 × 103.862 |
| `cloud-front-left.svg` | 701.974 × 198.81 |
| `cloud-front-right.svg` | 594.734 × 203.372 |
| `cloud-center.svg` | 530.645 × 44 |

## Replace an asset

1. Add the new export here, then update its `src`, `width`, `height`, and `alt` in `src/app/_landing/landing-config.ts`. Public paths begin with `/landing/`.
2. For the bird, update the inline paths and definitions in `src/app/_landing/origami-bird.tsx`; changing the config's `bird.src` alone does not replace the inline component. Keep its `viewBox`, orientation, and fold origins aligned with your replacement. Adjust `--bird-width` in `src/app/_landing/landing-hero.tsx`; update the height calculation if the new artwork has different proportions.
3. For decorative artwork, adjust its placement in `src/app/_landing/landing-backdrop.tsx`. Keep `alt: ""` for decorations. The existing transforms reproduce the export orientation from Figma.
4. Check the page on desktop and mobile. Background positions using `cqw` scale with the artwork container: `1cqw` is 1% of its width. Cloud opacity is controlled with `opacity-*`; the sky colors and gradient are Tailwind utilities in the hero.

## Bird motion

`data-bird-part` identifies the movable folds in the inline component. Their Tailwind `group-data-[pose=...]/bird:rotate-*` classes react to the hype button's pose. The original filters sit inside the moving groups, so they follow the paper shapes. Use the `origin-[...px_...px]` values as fold hinges, not percentages of the screen.

Continuous float/flap timing and interaction sequences live in `src/app/_landing/landing-experience.tsx`. Change `birdDriftDurationMs`, `birdMotionTiming`, and the button's `--fold-duration` utilities together. The tail's `delay-150` creates a subtle follow-through. There are no custom keyframes or per-frame JavaScript updates. Reduced motion and hidden tabs suppress movement without affecting counter requests.

Taps cycle squash/flutter, backward hop, and wing stretch, with three click pitches. Pointer zones tilt the head, lean the body, or flick the tail. `bird-surprises.tsx` adds a static radial halo, three warm fold glints, and four Google-colored orbit sparks using existing shapes and Tailwind transitions. The fifth-tap orbit lasts 2.4 seconds and triggers the shower; the fifteenth-tap `</>` constellation lasts 3.4 seconds and replaces the left pattern. Both replace the hint with editable captions and are remembered in sessionStorage for that tab. `milestoneSettings`, `clickSound`, and `focusCorners` are the main controls. No new image or font downloads are needed.

## Sky and entrance motion

`meteor.svg` contains the first head/trail pair and its original filters/gradients from `meteors-top.svg`. Its viewBox starts at y=65.6416 to preserve the source coordinates and filter padding. The similarly named `meteor-field.svg` is the old ring/dot artwork, not the shooting-star asset.

Edit `meteorTracks` in the backdrop to change the six starting positions and stagger delays. Opacity starts fading out at 600ms over 550ms, with the same per-track delay as the 1150ms movement, so no visible meteor pauses at its endpoint. Track wrappers move the entire head and trail together; only their transform and opacity change. Side glows reuse the original blurred SVGs, so the animation never changes blur strength. `stars` controls the four accent positions and peak opacities.

Cloud arrival classes rise 32px: left at 100ms, right at 240ms, center at 380ms. Their durations are 800/800/700ms. The bird now draws into place: seven traced outlines appear with 70ms staggers, followed by a 650ms color reveal after 1000ms. `birdPaths` is the shared coordinate source for outlines and colored folds. Its original offscreen flight has been replaced. Text entrance classes are in the hero. `skyTiming` in the experience controls ambient intervals, twinkle scheduling, and shower cleanup; keep its timing aligned with the backdrop's `duration-*` and `delay-*` utilities. Reduced motion and tab visibility apply to every new effect.

Two original constellation patterns are inline SVGs in `src/app/_landing/landing-constellations.tsx`. Their `points` and indexed `edges` define the artwork; normalized path lengths allow a Tailwind dash-offset transition to trace one side at a time. Mobile lowers opacity and crops them toward the edges. No extra artwork requests are needed.

Social icons are inline, monochrome SVG paths in the hero rather than additional downloads. Their editable destinations are the `socialLinks` array in the landing config.

Artwork descriptors are required; they do not use `null` fallbacks. To hide a decoration, remove its matching image from the backdrop; its descriptor can stay available for later use.

## Preserved earlier exports

`tech-mascot.png` (1122 × 1066), `cloud-left.svg` (705 × 227), and `cloud-right.svg` (368 × 226) are retained from the previous design. The current landing page does not use them.

## Generated hand-lettered hint

`try-clicking-me.png` is a 2172 × 724 transparent PNG created with the built-in image-generation tool, using the user's cropped lettering reference. The original generated file is preserved outside the repo; this project copy is the runtime source. Next Image serves a small optimized derivative at the displayed 160px width. The alpha channel remains intact. Its short arrow is part of the image.

Final generation prompt:

> Create one small production UI label asset, not a mockup. Use the provided cropped lettering image ONLY as a typography/style reference. Make new hand-drawn, rounded, chunky but gentle lowercase marker lettering like the reference: separate printed letters, slightly wobbly baseline, soft rounded ends, casual doodle feel. Absolutely NOT cursive, calligraphy, thin italic, or connected handwriting. Exact text, verbatim: "try clicking me!". To the immediate left of the wording add one very small hand-sketched arrow pointing diagonally up-right, matching the short straight arrow in the reference. The arrow should be only about the height of the lowercase letters and must not have a long curved swoosh. All lettering and arrow in a single muted lavender-gray #A39BB5. Completely transparent alpha background: no white background, no backdrop, no rectangular card, no shadow, no glow, no watermark, no extra symbols or copy. Wide shallow horizontal composition with the label filling almost the whole image width, only a slim transparent border; keep the text on a single line. This will be displayed about 150 pixels wide underneath the origami bird on a dark website. Preserve crisp readable rounded strokes at that small size.
