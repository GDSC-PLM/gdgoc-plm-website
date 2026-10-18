# Official website release verification

Recorded 2026-10-19, Asia/Manila. Canonical site: https://www.gdgocplm.org/.

## Completed checkpoints

1. Official search/share identity, typed profile configuration, server-rendered organization data, icon sizes, minimal static share image, and a shared cosmic placeholder for seven unfinished routes.
2. Next.js/lint patches, compatible dependency security updates, narrow database helper permissions, migration parity, and maintainable setup/customization documentation.

The homepage's visible wording, layout, bird motion, sparks delivery behavior, and artwork were retained. The frontend-design review kept placeholders in the existing palette/type/artwork; the SEO review excluded unfinished routes from indexing rather than inventing published features. No CSS Module, new stylesheet, custom keyframe, animation library, or new runtime dependency was added in this checkpoint.

## Checks completed

| Check | Result |
| --- | --- |
| Frozen-lockfile install | Pass with pnpm 11.15.0 |
| Lint | Pass |
| TypeScript (`tsc --noEmit`) | Pass |
| Next.js 16.3.8 production build | Pass; homepage and seven placeholders statically generated |
| Production dependency audit | No known vulnerabilities reported |
| Full dependency audit | One development-only `braces` advisory remains; details below |
| Homepage metadata | Official title/description, canonical www address, en-PH/en_PH, OG/Twitter card, 1200 × 630 image |
| Structured data | Organization/WebSite JSON parses, official names, four normalized sameAs profiles; present without client JavaScript |
| Crawl files | Homepage-only sitemap, crawlable assets, API exclusion, no fabricated last-modified dates |
| Preview/development indexing | Environment branches tested at module level; index disabled and sitemap empty |
| Placeholders | Seven HTTP 200 pages, route-specific titles/canonicals, noindex/follow, home/chapter links, no counter requests |
| Icons and share image | HTTP 200; SVG, 16/32/48 ICO, 180 Apple, 192/512 manifest PNGs, 512 organization logo, 1200 × 630 OG verified |
| Security and errors | Headers, real 404/noindex, real API GET/cookie/no-store/noindex, invalid payload/origin guards verified |
| Missing backend credentials | Separate local process with empty variables returns API 503; usable homepage without a made-up count |
| Secret exposure | Configured Supabase secret absent from browser assets; private env and SEO cache ignored |
| Viewports/accessibility | 1440 × 686, 393px/320px phones, short landscape, 200% text; no horizontal overflow; skip link, keyboard, forced colors, touch, reduced motion |
| Bird regressions | Three tap poses, both milestones, persistence, pointer zones, and hidden-tab suspension pass |
| Counter regressions | 25 taps → 3 sequential mocked batches; offline/reload recovery, response loss, throttling, two tabs, storage failure, 1000-tap cap, stale responses, lease takeover, browser restart pass |
| Supabase | Three local/hosted migration versions match; security advisor reports no issues |
| Helper permission probe | anon/authenticated execution denied, owner/server execution retained, automatic-RLS trigger still works; temporary probe rolled back |

Browser interaction tests intercepted counter writes. The only real API POST tests were deliberately rejected by validation/origin/cookie checks. No accepted public increments were sent by this release verification. The permission checks observed the public total unchanged at 1295. Earlier isolated 100-visitor measurements are retained separately in the counter guide, not presented as new capacity results.

The homepage loaded one Google Sans Flex WOFF2 in a fresh-browser font check; only that font face was marked loaded. The generated share PNG is 44,925 bytes and the multi-size ICO is 2,210 bytes. These are specific observations, not a Lighthouse or field Core Web Vitals score.

## Known limitations and external launch steps

- The full development audit retains [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) in `braces` 3.0.3, via ESLint/shadcn glob tooling. The registry's current release is 3.0.3 and no patched version is published. These tools are not production dependencies; avoid untrusted glob inputs and recheck updates. Production audit findings are zero.
- Next.js emits a Google Sans Flex fallback-metrics warning. The requested font loads successfully; no substitute font or visual redesign was introduced.
- A successful local release check does not establish that Vercel has finished deploying or has production secrets configured. No manual deployment, DNS change, analytics setup, or Search Console submission was performed. A push to the connected main branch may trigger its normal deployment.
- Preserve the chosen creative homepage copy. Broader content SEO and indexing the seven placeholders require real published content later; no ranking or indexing guarantee is made.

## Important execution flow

`site-config.ts` → route metadata/Organization/WebSite data and profile links. The visible hero config stays separate. A reusable server-rendered template supplies unfinished route presentation, while its group layout sets noindex.

Bird activation → existing IndexedDB save → immediate local display → bounded batch API request → atomic Supabase acknowledgement. This release changes neither that protocol nor the saved total. The new migration only narrows execution privileges on a hosted helper, and skips it when absent.

## File inventory

Relative to the previous Git commit: **69 created, 21 modified, 0 deleted; 90 files total**. This includes the existing uncommitted landing/counter implementation explicitly requested for this release; an “existing” row is not a claim that its behavior was newly changed by the SEO checkpoint. Build caches, credentials, and temporary verification scripts/screenshots are excluded.

| Status | File | Purpose |
| --- | --- | --- |
| Created | `.env.example` | Private Supabase variable names only; existing counter setup included. |
| Modified | `.gitignore` | Allow the empty env example; exclude credentials and SEO cache. |
| Modified | `AGENTS.md` | Preserve existing Tailwind-only contributor guidance. |
| Created | `docs/customization.md` | Retain detailed copy, spacing, font, artwork, motion, and metadata controls. |
| Created | `docs/release-verification.md` | Release checks, limitations, and this complete file inventory. |
| Created | `docs/sparks-counter.md` | Retain counter architecture, recovery rules, API contract, and prior isolated measurements. |
| Modified | `next.config.ts` | Compatible security headers; remove the framework identification header. |
| Modified | `package.json` | Next/lint patch versions, build-time shadcn classification, brand-generation command. |
| Modified | `pnpm-lock.yaml` | Exact dependency resolution, existing Supabase SDK, compatible security patches. |
| Modified | `pnpm-workspace.yaml` | Preserve build restrictions and pin the patched development glob parser. |
| Created | `public/brand/gdg-mark-512.png` | Transparent 512px organization logo for structured data. |
| Created | `public/brand/gdg-mark.svg` | Canonical square GDG mark assembled from supplied paths. |
| Created | `public/brand/icon-192.png` | Opaque 192px manifest icon. |
| Created | `public/brand/icon-512.png` | Opaque 512px manifest icon. |
| Created | `public/brand/README.md` | Source artwork, icon purposes, regeneration, and font licensing reference. |
| Created | `public/landing/cloud-back-left.svg` | Preserve supplied/source decorative artwork and its original proportions. |
| Created | `public/landing/cloud-back-right.svg` | Preserve supplied/source decorative artwork and its original proportions. |
| Created | `public/landing/cloud-center.svg` | Preserve supplied/source decorative artwork and its original proportions. |
| Created | `public/landing/cloud-front-left.svg` | Preserve supplied/source decorative artwork and its original proportions. |
| Created | `public/landing/cloud-front-right.svg` | Preserve supplied/source decorative artwork and its original proportions. |
| Created | `public/landing/cloud-left.svg` | Preserve supplied/source decorative artwork and its original proportions. |
| Created | `public/landing/cloud-right.svg` | Preserve supplied/source decorative artwork and its original proportions. |
| Created | `public/landing/dot-bottom.svg` | Preserve supplied/source decorative artwork and its original proportions. |
| Created | `public/landing/dot-trail-1.svg` | Preserve supplied/source decorative artwork and its original proportions. |
| Created | `public/landing/dot-trail-2.svg` | Preserve supplied/source decorative artwork and its original proportions. |
| Created | `public/landing/dot-trail-3.svg` | Preserve supplied/source decorative artwork and its original proportions. |
| Created | `public/landing/dot-trail-4.svg` | Preserve supplied/source decorative artwork and its original proportions. |
| Created | `public/landing/gdg-logo-left.svg` | Preserve supplied/source decorative artwork and its original proportions. |
| Created | `public/landing/gdg-logo-right.svg` | Preserve supplied/source decorative artwork and its original proportions. |
| Created | `public/landing/glow-bottom.svg` | Preserve supplied/source decorative artwork and its original proportions. |
| Created | `public/landing/glow-top.svg` | Preserve supplied/source decorative artwork and its original proportions. |
| Created | `public/landing/meteor-field.svg` | Preserve supplied/source decorative artwork and its original proportions. |
| Created | `public/landing/meteor.svg` | Preserve supplied/source decorative artwork and its original proportions. |
| Created | `public/landing/meteors-top.svg` | Preserve supplied/source decorative artwork and its original proportions. |
| Created | `public/landing/origami-bird.svg` | Preserve supplied/source decorative artwork and its original proportions. |
| Created | `public/landing/README.md` | Original export guide; updated editing locations and brand-guide link. |
| Created | `public/landing/space-glow-left.svg` | Preserve supplied/source decorative artwork and its original proportions. |
| Created | `public/landing/space-glow-right.svg` | Preserve supplied/source decorative artwork and its original proportions. |
| Created | `public/landing/star-edge-left.svg` | Preserve supplied/source decorative artwork and its original proportions. |
| Created | `public/landing/star-edge-right.svg` | Preserve supplied/source decorative artwork and its original proportions. |
| Created | `public/landing/star-field.svg` | Preserve supplied/source decorative artwork and its original proportions. |
| Created | `public/landing/star-large.svg` | Preserve supplied/source decorative artwork and its original proportions. |
| Created | `public/landing/star-small.svg` | Preserve supplied/source decorative artwork and its original proportions. |
| Created | `public/landing/star-white.svg` | Preserve supplied/source decorative artwork and its original proportions. |
| Created | `public/landing/star-yellow.svg` | Preserve supplied/source decorative artwork and its original proportions. |
| Created | `public/landing/tech-mascot.png` | Retain the earlier supplied mascot source; not rendered on the homepage. |
| Created | `public/landing/try-clicking-me.png` | Retain the existing transparent hand-lettered click hint. |
| Modified | `README.md` | Setup, architecture, production/migration workflow, checks, and documentation links. |
| Created | `scripts/generate-brand-assets.mjs` | Regenerate static icons/OG using existing tooling; no request-time generation. |
| Created | `src/app/_landing/bird-surprises.tsx` | Existing halo, fold glints, and orbit reward; unchanged behavior. |
| Created | `src/app/_landing/landing-backdrop.tsx` | Existing responsive clouds, stars, meteors, and reward glows; unchanged behavior. |
| Created | `src/app/_landing/landing-config.ts` | Preserve visible copy/artwork; source shared names and profiles from site config. |
| Created | `src/app/_landing/landing-constellations.tsx` | Existing paired patterns and code reward; unchanged behavior. |
| Created | `src/app/_landing/landing-experience.tsx` | Existing bird/sky coordination; carried into the release without behavior changes. |
| Created | `src/app/_landing/landing-hero.tsx` | Preserve hero presentation; enable the four configured profile icons. |
| Created | `src/app/_landing/origami-bird.tsx` | Existing inline folds/drawing paths; unchanged behavior. |
| Modified | `src/app/(public)/about/page.tsx` | Keep the route/placeholder; add its own title and canonical metadata. |
| Modified | `src/app/(public)/blogs/page.tsx` | Keep the route/placeholder; add its own title and canonical metadata. |
| Modified | `src/app/(public)/contact/page.tsx` | Keep the route/placeholder; add its own title and canonical metadata. |
| Modified | `src/app/(public)/events/page.tsx` | Keep the route/placeholder; add its own title and canonical metadata. |
| Modified | `src/app/(public)/layout.tsx` | Shared font, static cosmic backdrop, skip link, and placeholder noindex. |
| Modified | `src/app/(public)/partners/page.tsx` | Keep the route/placeholder; add its own title and canonical metadata. |
| Modified | `src/app/(public)/projects/page.tsx` | Keep the route/placeholder; add its own title and canonical metadata. |
| Modified | `src/app/(public)/team/page.tsx` | Keep the route/placeholder; add its own title and canonical metadata. |
| Created | `src/app/api/hype/route.ts` | Existing compatible GET/POST protocol and input/origin guards; unchanged behavior. |
| Created | `src/app/apple-icon.png` | Generated 180px Apple touch icon. |
| Modified | `src/app/favicon.ico` | Replace the starter icon with 16/32/48px GDG frames. |
| Created | `src/app/fonts.ts` | Share the unchanged Google Sans Flex font configuration. |
| Created | `src/app/icon.svg` | Generated resolution-independent GDG browser icon. |
| Modified | `src/app/layout.tsx` | Global identity, language, theme, indexing guard, and existing font preload choices. |
| Created | `src/app/manifest.ts` | Official application identity and 192/512px icon references. |
| Created | `src/app/opengraph-image.alt.txt` | Accessible description of the share image. |
| Created | `src/app/opengraph-image.png` | Static minimal 1200 × 630 social preview. |
| Modified | `src/app/page.tsx` | Official homepage metadata and escaped server-rendered Organization/WebSite JSON-LD. |
| Created | `src/app/robots.ts` | Production crawler rules; preview/development exclusion. |
| Created | `src/app/sitemap.ts` | Canonical homepage only; no invented modification dates. |
| Modified | `src/components/shared/footer.tsx` | Official names and four accessible profile destinations. |
| Modified | `src/components/shared/navbar.tsx` | Branded, responsive placeholder navigation with keyboard focus. |
| Modified | `src/components/shared/page-template.tsx` | One cosmic placeholder with useful home/community actions for seven routes. |
| Created | `src/features/hype/components/hype-counter.tsx` | Existing rolling digits and accessible feedback; unchanged behavior. |
| Created | `src/features/hype/queue-store.ts` | Existing durable queue, leases, cap, batching, and reconciliation; unchanged behavior. |
| Created | `src/features/hype/server/client.ts` | Existing server-only typed Supabase client; unchanged behavior. |
| Created | `src/features/hype/server/counter.ts` | Existing validated database operations; unchanged behavior. |
| Created | `src/features/hype/types.ts` | Existing API types, identifiers, and safe-number validation; unchanged behavior. |
| Created | `src/features/hype/use-hype-counter.ts` | Existing queue delivery, polling, retries, and tab coordination; unchanged behavior. |
| Created | `src/lib/site-config.ts` | Typed source for official names, canonical URL, metadata, and four profiles. |
| Created | `src/lib/site-metadata.ts` | Server-only route metadata, indexability, and Organization/WebSite data. |
| Created | `supabase/migrations/20261018073426_create_hype_counter.sql` | Existing initial counter/RLS/throttle migration; unchanged and already hosted. |
| Created | `supabase/migrations/20261018161339_add_buffered_hype_counter.sql` | Existing additive queue checkpoints and batch functions; unchanged and already hosted. |
| Created | `supabase/migrations/20261018172129_restrict_rls_helper_execution.sql` | Guarded helper EXECUTE restriction; verified and applied without resetting totals. |

## Reproduce the main checks

```powershell
pnpm install --frozen-lockfile
pnpm lint
pnpm exec next typegen
pnpm exec tsc --noEmit
pnpm build
pnpm audit --prod
pnpm start
```

Open the homepage and `/about`; check the four profiles and shared theme, inspect the canonical/robots tags, and request `/sitemap.xml`. For counter bursts, use mocked responses or isolated database objects rather than changing the public community count.
