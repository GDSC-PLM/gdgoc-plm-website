# Public frontend delivery

Implementation and browser measurements recorded 2026-11-08, Asia/Manila. Documentation prepared for the repository push on 2026-11-27. Measurements below retain their original date; they are not new hosted-production results.

## What changed

The homepage now follows Header → Hero → AVP → Who Are We → Featured Events → Latest Blogs → Games → Executive Board → Partners → Footer. Shared public navigation/footer wrap all seven destination pages and nine sample detail pages. The teaser, origami-bird presentation, and counter display component are removed; the counter API, server/data code, queue storage, and saved data remain untouched.

The public route group keeps the homepage at `/`. Every public page has one main landmark. Destination and detail pages use `noindex, follow`; the sitemap still excludes placeholders. Canonical and Organization/WebSite metadata remain on the homepage.

## Checks and actual results

- Passed: `pnpm lint`, `pnpm exec next typegen`, `pnpm exec tsc --noEmit`, `pnpm build`.
- The recorded browser checks used the production server at http://localhost:3001 and the development server at http://localhost:3000; these are historical local addresses.
- All 17 valid routes returned 200, with one main and one h1. Invalid event/blog/project slugs returned 404.
- Checked homepage at 1440×900, 1920×1080, 768×1024, 393×844, 320×740, and 844×390.
- Checked doubled root text sizing at 393px and 320px. Fixed board control collisions and narrow heading/email overflow. Final 320px scroll width is exactly 320px. All seven destination pages also passed the 320px doubled-text page-width check; Team uses fluid cards and Partners uses adaptive columns. Decorative card glows may extend beyond their frames; member text remains within the card.
- No broken loaded images or page-wide horizontal overflow in recorded viewport checks. No page errors/hydration errors or counter requests were recorded.
- Mobile disclosure closes on destination selection and Escape; Escape restores trigger focus. Short-landscape Contact remains reachable. Skip link focuses main. Active-route styling works on destination pages.
- Carousel starts at 2/3, wraps through 1/3, responds to arrow keys and touch swipes, and does not autoplay.
- Flappy Haribot and Matching Game detail/close/Escape flows work; Escape restores row focus. Both Play destinations returned 200 in a browser.
- Board first-view reveal, executive/deputy selection, and rapid selection were checked. Latest selection wins.
- All 17 partner nodes changed during a loop longer than two seconds. Offscreen state pauses; reduced motion resets all offsets to zero. Hidden-tab handling was exercised with a simulated document.hidden/visibilitychange event.
- Failed game-cover request was intercepted: fallback retained a 315×112 reserved box. Unavailable AVP renders no video element/request.
- Direct detail visits, refresh, and browser Back to listing were checked.

## Loading measurements

These are Chromium PerformanceObserver measurements against the local **production** server, not field Core Web Vitals or a Lighthouse score. Mobile lab conditions: fresh browser context, browser cache disabled, 393×844 viewport, DPR 2, 4× CPU slowdown, 150ms latency, 200,000 bytes/sec download (1.6 Mbps), 93,750 bytes/sec upload. Hosted latency and different devices may change results.

| Measurement | Recorded result |
| --- | ---: |
| Initial run LCP | 2.836 seconds |
| Initial run CLS | 0.000573 |
| Fresh-context run after font-subset fix: LCP | **2.420 seconds** |
| Fresh-context run CLS | **0.000000** |
| Initial image transfers, including preload requests | **10,868 bytes** across 6 assets |
| Initial resource transfers, excluding HTML document | 466,392 bytes |
| Image transfers after jumping to Partners | 242,454 bytes |
| Exact duplicate source asset bytes removed | **382,361 bytes** |

Decorative arrow glyphs caused the browser to request roughly 175KB of Google Sans Flex math/symbol subsets. Replacing the relevant arrows with SVG/removing the redundant glyph avoided those downloads without changing the typeface.

No game cover or video was mounted in the initial viewport. One additional JavaScript chunk was fetched when the partner artwork approached view; this contains the deferred exported tracks. Static resting artwork remains in the server response.

Examples of optimized raster response bodies at the recorded mobile DPR:

| Image | Original bytes | Optimized bytes at 384px |
| --- | ---: | ---: |
| Sample executive portrait | 375,595 | 13,412 |
| Blinc logo | 225,560 | 9,878 |
| GCash logo | 102,326 | 23,892 |

The final recorded mobile lab run meets LCP ≤2.5s and CLS ≤0.1. This is one lab run, not a production performance guarantee.

## Review artifacts

- [Full desktop homepage](review/public-frontend/homepage-desktop-final.png)
- [Full mobile homepage](review/public-frontend/homepage-mobile-final.png)
- [Desktop hero](review/public-frontend/hero-desktop-final.png)
- [Mobile hero](review/public-frontend/hero-mobile-final.png)
- [320px doubled-text review](review/public-frontend/text-200-320-final.png)
- [Team directory](review/public-frontend/team-desktop.png)
- [Route results](review/public-frontend/route-checks.json)
- [Responsive results](review/public-frontend/responsive-checks.json)
- [Destination enlarged-text checks](review/public-frontend/destination-enlarged-text.json)
- [Final regression results](review/public-frontend/final-regressions.json)
- [Fresh mobile loading details](review/public-frontend/mobile-loading-lab-fresh.json)
- [Deferred images and animation](review/public-frontend/deferred-images.json)
- [External game checks](review/public-frontend/external-game-checks.json)
- [Machine-readable file inventory](review/public-frontend/changed-files.json)
- [Asset consolidation map](review/public-frontend/asset-remaps.json)

## How it works

1. `src/content/public-content.ts` holds typed local records, stable slugs, body blocks, and nullable unavailable destinations. `home-config.ts` retains sample game and member records.
2. Server pages read those records and render previews, lists, detail metadata, body sections, and static artwork. The same event title appears on the homepage, event listing, and detail route.
3. The carousel receives server-rendered cards as props. Its client state stores only the selected index. Game state stores the selected game; board state stores requested/displayed group and reveal timing.
4. User actions update that small state, causing React to render the corresponding card/panel/group. No backend writes are introduced.
5. Image metadata supplies dimensions and small blur previews; Next.js serves raster variants sized for each layout. Browser errors replace game/member imagery with a reserved-size fallback.
6. A viewport observer imports the original partner tracks near view. One timeline keeps all offsets aligned; visibility and motion preference decide whether it runs.
7. `(public)/layout.tsx` supplies the common page shell. A route group is a folder convention, so moving `page.tsx` into it does not change the URL.

## How to test one content change

Edit an event title in `src/content/public-content.ts`, run `pnpm dev`, and inspect the homepage preview, `/events`, and its detail route. The same value should appear in all three. Open a detail card, refresh, and use browser Back. This demonstrates local content → component props → rendered page.

For a production review: run `pnpm build`, then `pnpm start --port 3001`.

## Remaining limitations

The AVP source, mascot artwork, story bodies, project material, registration/demo/source destinations, and sample board/partner content remain placeholders by request. The 50+ statistic is retained from Figma. CMS, login, live registrations/submissions, live leaderboards, and hosted deployment verification remain separate.

Next.js emits its existing Google Sans Flex fallback-metrics warning during the build. The actual font downloads and renders successfully. No hosted-device or real-user performance measurements were performed.

## Original implementation inventory

This includes the earlier Games/Board/Partners work carried into this delivery, including its existing Motion dependency changes. The original implementation inventory recorded **253 files: 227 created (205 assets), 16 modified, and 10 deleted**. Intermediate untracked duplicate assets are listed separately below.

| Change | File | Purpose |
| --- | --- | --- |
| Modified | `README.md` | Updated scope, local setup, architecture, and delivery links. |
| Modified | `docs/customization.md` | Editable content, loading, state, and retired teaser guide. |
| Modified | `package.json` | Pinned Motion 14.10.1 from the earlier section implementation; retained. |
| Modified | `pnpm-lock.yaml` | Resolved Motion dependency graph from the earlier implementation; retained. |
| Modified | `pnpm-workspace.yaml` | Existing narrow release-age exceptions for the requested Motion version; retained. |
| Modified | `src/app/(public)/about/page.tsx` | Complete public destination page using local sample content. |
| Modified | `src/app/(public)/blogs/page.tsx` | Complete public destination page using local sample content. |
| Modified | `src/app/(public)/contact/page.tsx` | Complete public destination page using local sample content. |
| Modified | `src/app/(public)/events/page.tsx` | Complete public destination page using local sample content. |
| Modified | `src/app/(public)/layout.tsx` | Shared header, footer, fonts, skip link, and single main landmark. |
| Modified | `src/app/(public)/partners/page.tsx` | Complete public destination page using local sample content. |
| Modified | `src/app/(public)/projects/page.tsx` | Complete public destination page using local sample content. |
| Modified | `src/app/(public)/team/page.tsx` | Complete public destination page using local sample content. |
| Deleted | `src/app/_landing/bird-surprises.tsx` | Removed unused teaser or generic placeholder presentation. |
| Deleted | `src/app/_landing/landing-backdrop.tsx` | Removed unused teaser or generic placeholder presentation. |
| Deleted | `src/app/_landing/landing-config.ts` | Removed unused teaser or generic placeholder presentation. |
| Deleted | `src/app/_landing/landing-constellations.tsx` | Removed unused teaser or generic placeholder presentation. |
| Deleted | `src/app/_landing/landing-experience.tsx` | Removed unused teaser or generic placeholder presentation. |
| Deleted | `src/app/_landing/landing-hero.tsx` | Removed unused teaser or generic placeholder presentation. |
| Deleted | `src/app/_landing/origami-bird.tsx` | Removed unused teaser or generic placeholder presentation. |
| Modified | `src/app/fonts.ts` | Shared Google Sans Flex, Plus Jakarta Sans, and Space Grotesk definitions. |
| Deleted | `src/app/page.tsx` | Moved homepage into the public route group; URL remains /. |
| Modified | `src/components/shared/footer.tsx` | Figma-inspired footer with official contact destinations. |
| Modified | `src/components/shared/navbar.tsx` | Sticky responsive navigation and disclosure/focus behavior. |
| Deleted | `src/components/shared/page-template.tsx` | Removed unused teaser or generic placeholder presentation. |
| Deleted | `src/features/hype/components/hype-counter.tsx` | Removed unused teaser or generic placeholder presentation. |
| Created | `docs/public-frontend-delivery.md` | Verification evidence and complete working-tree inventory. |
| Created | `public/home/about/imgBackgroundShadowOverlayBlur.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/about/imgSvgSparkles.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/avp/imgSvg8.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/avp/imgSvg9.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/blogs/imgSvg10.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/blogs/imgSvg2.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/blogs/imgSvg6.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/asset-blue-triangle.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/asset-red-triangle.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/asset-yellow-triangle.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/bg-constellation.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/bg-constellation1.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/bg-galaxy.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/bg-galaxy1.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/bg-star.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/border.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/card-executive-unflipped.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/card-executive-unflipped1.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/card-executive-unflipped2.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/card-executive-unflipped3.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/moon.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/selected-thumb.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/star26.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/star27.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/star28.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/vector.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/vector1.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/vector15.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/vector16.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/vector17.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/vector19.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/vector2.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/vector24.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/vector25.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/vector26.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/vector27.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/vector28.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/vector29.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/vector3.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/vector30.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/vector31.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/vector32.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/vector33.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/vector35.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/vector36.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/vector630.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/vector631.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/vector633.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/board/vector634.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/deputy-back/card-deputy-unflipped.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/deputy-back/card-moon.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/deputy-back/constellation.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/deputy-back/constellation1.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/deputy-back/constellation2.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/deputy-back/constellation3.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/deputy-back/ellipse616.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/deputy-back/ellipse625.png` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/events/imgSvg1.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/events/imgSvg2.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/events/imgSvg3.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/executive-face/img-executive.jpg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/flappy-details/cover-image-flappy-haribot.png` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/flappy-details/hugeicons-cancel01.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/flappy-details/logo.png` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/footer/imgSubtleTopGlowLine.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/asset-haribot-in-trophy.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/bg-cloud-left-distant.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/bg-cloud-left-upper.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/bg-cloud-left-upper1.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/bg-cloud-left.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/bg-cloud-middle.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/bg-cloud-right-distant.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/bg-cloud-right.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/bg-galaxy.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/bg-galaxy1.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/bg-galaxy2.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/bg-galaxy3.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/bg-orbit.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/bg-orbit1.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/bxs-user.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/logo-extra-game.png` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/logo-flappy-haribot.png` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/logo-matching-game.png` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/logo-perch-party.png` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/stars.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/upper-right-cloud-distant.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/upper-right-cloud-foreground.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/vector.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/vector1.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/vector10.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/vector11.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/vector12.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/vector14.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/vector15.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/vector16.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/vector17.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/vector18.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/vector19.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/vector2.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/vector20.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/vector21.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/vector22.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/vector23.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/vector24.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/vector25.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/vector26.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/vector3.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/vector4.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/vector5.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/vector6.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/vector7.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/vector8.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/games/vector9.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/hero/img8PointCompassStarSvg.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/hero/imgCurvedLightStreakSwooshSvg.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/hero/imgSvg4PointSparkleStarsAroundFrame.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/matching-details/cover-image-matching-game.png` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/asset-comet.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/asset-comet1.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/asset-comet2.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/asset-comet3.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/asset-comet4.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/asset-comet5.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/asset-orbit1.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/asset-orbit2.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/asset-orbit3.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/bg-constellation.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/bg-constellation1.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/bg-partnerships-constellations.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/bg-shading.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/ellipse592.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/ellipse593.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/ellipse594.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/ellipse595.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/ellipse88.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/ellipse89.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/ellipse90.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/ellipse91.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/ellipse92.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/group.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/group1.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/group2.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/img-blinc.png` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/img-bpi.png` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/img-course-hero.png` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/img-datacamp.png` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/img-devcon.png` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/img-gcash.png` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/img-home-credit.png` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/img-prosple.png` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/img-symph.png` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/img-whitecloak.png` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/smoothened-space.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/star26.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/star27.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/star28.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector1.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector10.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector11.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector12.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector13.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector14.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector15.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector16.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector17.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector18.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector19.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector2.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector20.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector21.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector22.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector23.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector24.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector25.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector26.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector27.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector28.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector29.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector3.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector30.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector31.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector32.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector33.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector34.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector35.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector36.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector37.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector38.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector39.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector4.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector40.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector41.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector42.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector43.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector44.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector45.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector46.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector47.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector48.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector5.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector6.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector7.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector8.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `public/home/partners/vector9.svg` | Local original Figma export; deduplicated asset collection. |
| Created | `src/app/(public)/blogs/[slug]/page.tsx` | Static sample detail routes, metadata, and unknown-slug 404 handling. |
| Created | `src/app/(public)/events/[slug]/page.tsx` | Static sample detail routes, metadata, and unknown-slug 404 handling. |
| Created | `src/app/(public)/not-found.tsx` | Public-layout 404 for unknown detail records. |
| Created | `src/app/(public)/page.tsx` | Full homepage composition, canonical, and organization metadata. |
| Created | `src/app/(public)/projects/[slug]/page.tsx` | Static sample detail routes, metadata, and unknown-slug 404 handling. |
| Created | `src/app/_home/blog-carousel.tsx` | Featured-first wrapping carousel with keyboard and touch controls. |
| Created | `src/app/_home/executive-board-section.tsx` | Card reveal/switching and directory layout, with enlarged-text handling. |
| Created | `src/app/_home/games-section.tsx` | Existing game selection/focus flow with optimized covers and natural content height. |
| Created | `src/app/_home/home-artwork.tsx` | Server-rendered original section artwork with optimized raster sources. |
| Created | `src/app/_home/home-config.ts` | Typed game/member samples and shared visual classes. |
| Created | `src/app/_home/introduction-sections.tsx` | Hero, AVP, About, Events, and Blogs homepage sections. |
| Created | `src/app/_home/partner-motion.ts` | All 17 original Figma animation tracks and shared offsets. |
| Created | `src/app/_home/partners-section.tsx` | Server-artwork slots and deferred, visibility-aware animation lifecycle. |
| Created | `src/app/_home/video-panel.tsx` | No-request unavailable video state and activation-only playback. |
| Created | `src/components/shared/content-card.tsx` | Server-rendered linked preview/listing card. |
| Created | `src/components/shared/destination.tsx` | Shared destination shell and typed detail body renderer. |
| Created | `src/components/shared/media-image.tsx` | Reserved image-error fallback. |
| Created | `src/content/media.ts` | Static game-cover and portrait dimensions/blur metadata. |
| Created | `src/content/partner-media.ts` | Static partner-logo dimensions/blur metadata. |
| Created | `src/content/partners.ts` | Ten supplied partner directory records. |
| Created | `src/content/public-content.ts` | Typed events, stories, projects, body blocks, navigation, and media availability. |

## Consolidated or renamed intermediate exports

These earlier untracked exports were removed/repointed before the final inventory. Paths are relative to public.

| Previous path | Retained path |
| --- | --- |
| `/home/games/vector13.svg` | `/home/games/vector12.svg` |
| `/home/executive-face/img-executive.png` | `/home/executive-face/img-executive.jpg` |
| `/home/deputy-face/img-deputy.png` | `/home/executive-face/img-executive.jpg` |
| `/home/board/vector10.svg` | `/home/partners/vector37.svg` |
| `/home/board/vector11.svg` | `/home/partners/vector38.svg` |
| `/home/board/vector12.svg` | `/home/partners/vector39.svg` |
| `/home/board/vector13.svg` | `/home/partners/vector46.svg` |
| `/home/board/vector14.svg` | `/home/partners/vector47.svg` |
| `/home/board/vector18.svg` | `/home/partners/vector37.svg` |
| `/home/board/vector20.svg` | `/home/partners/vector39.svg` |
| `/home/board/vector21.svg` | `/home/partners/vector36.svg` |
| `/home/board/vector22.svg` | `/home/partners/vector37.svg` |
| `/home/board/vector23.svg` | `/home/partners/vector47.svg` |
| `/home/board/vector34.svg` | `/home/board/vector31.svg` |
| `/home/board/vector4.svg` | `/home/partners/vector36.svg` |
| `/home/board/vector5.svg` | `/home/board/vector17.svg` |
| `/home/board/vector6.svg` | `/home/partners/vector46.svg` |
| `/home/board/vector7.svg` | `/home/partners/vector47.svg` |
| `/home/board/vector8.svg` | `/home/partners/vector34.svg` |
| `/home/board/vector9.svg` | `/home/partners/vector36.svg` |

## Repository push preparation — 2026-11-27

Updated README route coverage, removed stale local-only and audit claims, and copied all referenced review artifacts into `docs/review/public-frontend/` so their relative links work in GitHub. The inventory above describes the original implementation; this preparation also adds the evidence files listed in the Review artifacts section.

Revalidated on 2026-11-27 before push: lint, route type generation, TypeScript checking, and production build passed. The existing Google Sans Flex fallback-metrics warning remains. Browser screenshots and loading measurements above are from the original 2026-11-08 review.
