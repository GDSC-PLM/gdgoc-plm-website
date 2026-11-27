# Customizing the public website

The public frontend uses local sample content. It does not require a database to render. CMS, authentication, live registration, submissions, and leaderboards remain separate work.

## Start with one content record

| Change | File |
| --- | --- |
| Events, stories, projects, mission, vision, video source, email, navigation | `src/content/public-content.ts` |
| Ten supplied partner names and logos | `src/content/partners.ts` |
| Static game cover and portrait imports (dimensions and blur data) | `src/content/media.ts` |
| Static partner image imports | `src/content/partner-media.ts` |
| Game descriptions, Play URLs, sample executives/deputies, shared heading/button classes | `src/app/_home/home-config.ts` |
| Official organization metadata and verified social destinations | `src/lib/site-config.ts` |
| Homepage order | `src/app/(public)/page.tsx` |
| Homepage hero, introduction, and preview sections | `src/app/_home/introduction-sections.tsx` |
| Shared navigation, footer, cards, and detail layout | `src/components/shared/` |
| Font definitions | `src/app/fonts.ts` |

A record's `slug` is its stable URL segment. For example, `innolympics-2026` renders at `/events/innolympics-2026`. The same record supplies its homepage preview, listing card, and detail view. Changing a title in one place updates all three. Keep slugs stable when changing wording.

Dates are retained from Figma; the event list does not call them upcoming. Article/project bodies are explicitly labeled placeholders. Replace each record’s typed `body` blocks when real material becomes available. Each block contains a heading and text; `ContentDetail` renders them in order.

Unavailable external destinations use `null`. Registration, demo, and source actions remain disabled until a URL is supplied. Email uses `mailto:`. AVP `src: null` produces no video request; setting a source still requires the visitor to activate Play. The mascot panel intentionally reserves space for unavailable artwork.

## Rendering and state

1. Server pages read local records and create HTML cards/artwork.
2. The public route-group layout wraps every page in one navigation, one main landmark, and one footer. Parentheses in `(public)` organize files without appearing in URLs.
3. Client components handle only browser interactions: mobile disclosure, carousel position, selected game, selected board, video activation/error state, image error state, and animation lifecycle.
4. The carousel receives server-rendered card slots, starts at the featured middle card, wraps in both directions, supports arrows/swipes, and never autoplays.
5. Game details mount on selection. Close/Escape restores focus to the originating row. Only the two supplied games have links.
6. Board switching closes the cards for 300ms, swaps sample members, and reveals over 600ms with a 70ms stagger. A newer selection cancels the pending switch.
7. Partner artwork is present in server HTML. Its 17 exported tracks load when the artwork approaches the viewport, then play on one two-second timeline only while visible and the tab is active. Reduced motion leaves the resting composition.

## Layout and imagery

Full-width midnight backgrounds sit behind bounded readable content. Section minimum heights provide a desktop viewport rhythm; text and mobile content can grow through normal page scrolling. Heading text is solid, with restrained decorative glows.

Substantial raster artwork uses Next.js image optimization, responsive `sizes`, intrinsic dimensions, and static-import blur previews. SVG artwork and small game icons remain lossless. Below-fold images are lazy; hero/branding artwork is eager. Game covers mount only when opened. Byte-identical exports were consolidated, saving 382,361 bytes; the portrait's incorrect PNG extension was corrected to JPEG.

Keep replacement image aspect ratios/dimensions in metadata accurate. Fixed media containers preserve space while loading or after failure. The original exports live in `public/home/`; static raster imports reference those same files.

## Search and retired teaser

Homepage canonical and Organization/WebSite metadata remain. Placeholder destinations and detail routes are `noindex, follow` and omitted from the sitemap. No Event or Article structured data is fabricated.

The teaser page and bird components are removed from the public route tree. The existing counter API, server implementation, database migrations, and saved browser data are preserved. Public pages neither mount the counter hook nor send counter requests.

## One test path

Run `pnpm lint`, `pnpm exec next typegen`, `pnpm exec tsc --noEmit`, then `pnpm build` and `pnpm start`. Open the local site, select Events in the shared navigation, open a sample card, refresh, then use Back to events. The title and metadata should come from the same local record throughout.

For interaction changes, also check keyboard navigation, Escape/focus restoration, reduced motion, a 320px viewport, short landscape, and doubled text size.
