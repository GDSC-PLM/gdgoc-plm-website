# Customizing the website

## Landing page controls

Start with one control at a time:

| What to edit | Where |
| --- | --- |
| Official names, canonical URL, metadata, four social/profile destinations | `src/lib/site-config.ts` |
| Visible homepage wording and artwork paths | `src/app/_landing/landing-config.ts` |
| Colors, type sizes, bird size, branding, text entrances | `src/app/_landing/landing-hero.tsx` |
| Header/footer placement, overall vertical position, bird and sky timing | `src/app/_landing/landing-experience.tsx` |
| Clouds, stars, meteor tracks, side glow strength | `src/app/_landing/landing-backdrop.tsx` |
| Wing and tail shapes, drawing paths, hinges, rotations | `src/app/_landing/origami-bird.tsx` |
| Header count and loading/error/retry presentation | `src/features/hype/components/hype-counter.tsx` |
| Constellation points and line connections | `src/app/_landing/landing-constellations.tsx` |
| Counter requests and queue | `src/features/hype/use-hype-counter.ts` |
| Saved taps, batch size, timing, cross-tab lease | `src/features/hype/queue-store.ts` |
| Halo, warm glints, Google-colored orbit | `src/app/_landing/bird-surprises.tsx` |
| Shared Google Sans Flex font | `src/app/fonts.ts` |

### Wording and social links

`title` contains two explicit lines: `["Something", "Stellar is cooking."]`. The badge above the headline is `status`; `counter.hint` supplies the accessible instruction for the handwritten PNG. `counter.count` names the community count, currently “sparks and counting.” The editable logo text comes from `organization`, `program`, and `campus`.

Edit the four `href` strings in `siteConfig.socialLinks` in `src/lib/site-config.ts` to update Facebook, Instagram, TikTok, and GDG Community. Empty destinations render visible, disabled icons without navigating. The icon paths are in `socialIconPaths` in the hero; all use the same monochrome color and 44px touch area.

### Spacing, sizing, and colors

The page uses `h-dvh` for screen height and allows vertical scrolling when enlarged text or short screens require it. In the experience's `main`, `pb-26` is your desktop upward offset: more bottom padding moves the centered group upward. Phones use `max-md:py-2`, with the counter and bird centered together between the logo and social footer; short screens use `pb-6`.

| Gap or appearance | Exact control |
| --- | --- |
| Bird → click instruction | `-mt-5 md:-mt-9` on `data-hype-hint` in the experience; more negative moves the label closer |
| Instruction → eyebrow | `--bird-copy-gap` on the hero wrapper |
| Eyebrow → headline | `--eyebrow-gap` on the hero wrapper |
| Headline → description | `--description-gap` on the hero wrapper |
| Header inset | `--page-x`, `--page-top` |
| Mobile logo size | `max-md:[--brand-width:clamp(12rem,56vw,14rem)]` in the hero |
| Mobile counter → bird | `mb-1` on the counter wrapper in the experience |
| Mobile social footer inset | `pb-[max(1.5rem,env(safe-area-inset-bottom))]` in the experience |
| Mobile clouds | `min-w-160` on the backdrop scene, `max-md:-bottom-2` on side clouds, `max-md:bottom-0` on the center cloud |
| Bird size | `--bird-width`, `--bird-height` |
| Text sizes | `--heading-size`, `--count-size`, `--number-size`, `--description-size` |
| Colors | `--midnight`, `--indigo`, `--white`, `--muted-lavender`, `--lavender`, `--star-yellow` |

The logo symbol uses `--brand-width * 0.22892`, 75% of its earlier size. Its two wordmark sizes use separate multipliers (`0.05333` and `0.03`) so shrinking the symbol does not shrink the text.

`--bird-height` reserves space for the rotated SVG. Keep it proportional to width. Check the `max-md:` and short-screen overrides when changing a size. The single counter is positioned at the page's horizontal center in the desktop header; below tablet width it stays in normal flow immediately above the bird. The logo centers above it and socials move to the footer. Feedback reserves 40px above the count on phones, below it on desktop, so errors do not push the bird around. Loading is shown by the count's dots and accessible label. Enlarged text can wrap branding and socials.

### Motion

All styling uses Tailwind utilities and the installed `tw-animate-css`; there are no custom keyframes or CSS Modules.

- **Bird arrival:** the seven shapes share one `birdPaths` object in the inline SVG. Outlines draw with normalized `pathLength="1"`, dash-offset transitions, and 70ms staggers. Colored folds fade in at 1000ms over 650ms. `paperStage` in the experience starts the trace at 60ms and fades the outline at 1450ms; `entranceDurationMs` releases the idle flap at 2000ms. Clicking skips the unfinished introduction. This drawing entrance replaces the earlier offscreen flight.
- **Text arrival:** `textEntrance` in the hero sets a 12px rise over 400ms. The eyebrow starts at 250ms, headline lines at 320/390ms, and description at 460ms.
- **Cloud arrival:** `cloudEntrance` and each cloud's classes in the backdrop set the rise. Left/right/center start at 100/240/380ms, taking 800/800/700ms. They remain still afterward. Keep `entranceDurationMs` in the experience longer than the last entrance's delay plus duration.
- **Living bird:** `birdDriftDurationMs` sets each 2.2-second half of the gentle float/flap. `birdMotionTiming` controls interaction poses; the button's `--fold-duration` classes control CSS transition speeds. The inline SVG's tail follows 150ms later.
- **Sky:** `skyTiming` schedules a shooting star every 12/18/15 seconds and a slow twinkle on one of four stars. The fifth-tap reward starts the 2.1-second shower; ordinary taps do not. Desktop uses six meteor tracks, phones three. The reward can replace an ambient meteor. Extra clicks keep their bird reaction and counter requests without stacking showers.
- **Artwork movement:** `meteorTracks` in the backdrop sets starting positions and 90ms staggers. Mobile travel uses one distance, `max(70vw,50dvh)`: left by that distance and down by 85% of it, keeping the path aligned with the diagonal tail on tall phones. Edit `--meteor-x` and `--meteor-y` to change the path. Travel uses `duration-1150`; opacity fades in over 180ms and begins fading out at 600ms over 550ms, with the same stagger as movement. Each meteor becomes invisible before it stops moving. Glow opacity/translation uses 450ms in and 1100ms out. Keep these utilities synchronized with `skyTiming`.
- **Constellations:** two original patterns live in `landing-constellations.tsx`. Edit `points` and indexed `edges` to reshape them. Their thin baseline remains still while a brighter trace alternates sides. `constellationTiming` in the experience controls the initial delay, hold, fade, and next trace. Phones crop the patterns into the edges at lower opacity.
- **Handwriting:** `assets.hintLabel` points to `public/landing/try-clicking-me.png`, a transparent hand-lettered label with a small arrow. The hero renders it through Next Image at `w-40`; the experience moves it closer using negative top margins. It has screen-reader text but no additional font download. Replacing its words requires replacing the PNG and updating `counter.hint`.
- **Tap spring and sound:** taps cycle `tap` (0.94 squash), `hop` (4px back/6px up), and `stretch` (slight body lift and wider wings). `birdMotionTiming` and the button's `--fold-duration` utilities set timing. All return through the `settle` curve `cubic-bezier(0.34,1.56,0.64,1)` over 420ms. `clickSound.pitches` supplies three quiet pitch pairs; `peakGain` changes volume and `durationSeconds` length. Audio is prepared inside the user gesture, plays after the local save, and cleans up on navigation.
- **Pointer personality:** the left 35%, center 30%, and right 35% of the button map to head/body/tail attention. `attend()` only changes state when the zone changes. Fold hinges and rotations are in the inline SVG; touch-down and keyboard focus receive head attention.
- **Milestones:** `milestoneSettings` selects tap 5 (2.4-second Google-colored orbit/shower) and tap 15 (3.4-second code constellation, including a 400ms fade). `counter.attention` and `counter.hello` in the config set captions. `sessionStorage` key `gdgoc-bird-visit-v1` remembers discoveries across reloads in that tab. Only one reward and one pending code reward can exist. Clear that key in DevTools to preview them again. The orbit and three warm glints are static JSX in `bird-surprises.tsx`; the left-side `</>` is in the constellation component.
- **Focus:** `focusCorners` and `data-bird-focus` in the experience draw four lavender keyboard-focus corners. Forced-colors mode uses a native outline. No extra key handler is needed: the bird remains a native button supporting Enter/Space.
- **Rolling digits:** `RollingCount` aligns slots from the right and compares the previous displayed number with the new one. Only changed digits roll downward over 300ms; commas remain still. Values now include saved, locally pending taps. There is no syncing label. Reduced motion or a hidden tab disables rolling.

Reduced motion disables entrances, folds, and sky effects. Hiding the tab clears motion timers; returning resumes ambient activity without replaying the entrance. There are no per-frame React updates.

### How the pieces connect

The Server Component hero passes branding, socials, copy, backdrop, bird, and surprise artwork into `LandingExperience` as rendered slots. That client component calls `useHypeCounter()` once and supplies its state to the count.

Activation → `queueTap()` commits to IndexedDB → immediate number/bird reaction → a bounded batch POST → server acknowledgement. `queueTap()` now returns `Promise<boolean>`: `true` means saved on the device. Confirmed totals and acknowledgements are stored together before pending taps are subtracted.

Artwork is in `public/landing/`; see [the artwork guide](../public/landing/README.md) for exports and replacement instructions. Existing public-page styles are independent of the landing styles.


## Public templates and editable content

`src/components/shared/page-template.tsx` supplies the placeholder for About and the fallback for Contact. The public shell supplies clouds, stars and the Google Sans Flex font. The CMS collections and shared article template live in `src/features/cms/`. Published site settings control navigation and footer content through the shared components.

Officers can prepare and preview content, update the homepage and site links, publish immediately, or schedule a saved revision. See the [CMS route map and settings workflow](cms.md#stage-6-public-routes-and-site-settings).

## Search and share identity

`src/lib/site-config.ts` is the source of official names, social/profile links, and the canonical `https://www.gdgocplm.org/` address. `src/lib/site-metadata.ts` creates each route's metadata and the homepage's Organization/WebSite JSON-LD. The visible homepage hero copy is separate on purpose. Changing it is not required to update a search description.

The root metadata sets `en-PH` and the midnight theme color. Homepage indexing is enabled for production builds, but disabled when `VERCEL_ENV` is `preview` or `development`. Production robots allow assets and exclude `/api/`; the sitemap lists only the homepage and omits invented modification dates.

The canonical mark is `public/brand/gdg-mark.svg`, assembled from the two original Figma exports. Run `pnpm brand:generate` after changing that source: it regenerates the ICO, SVG favicon, Apple icon, PNG variants, organization logo, and static Open Graph image. The generator uses existing Next.js/Sharp tooling and downloads a static Google Sans Flex WOFF from Google Fonts. It is not part of the build or a request handler. The checked-in PNG works without that font download at runtime. Keep its matching alt text in `src/app/opengraph-image.alt.txt` accurate.
