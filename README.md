# GDGoC PLM

Official website of **Google Developer Groups on Campus PLM**, the community at **Pamantasan ng Lungsod ng Maynila**.

Production: [www.gdgocplm.org](https://www.gdgocplm.org/). Built with Next.js App Router, React, TypeScript, Tailwind CSS, and Supabase.

The public homepage includes Hero, AVP, Who Are We, Featured Events, Latest Blogs, Games, Executive Board, and Partners, wrapped in shared navigation and footer. Seven destination pages and nine sample detail routes use editable local placeholders. See the [customization guide](docs/customization.md) for content and interaction controls.

The teaser UI is retired. Its counter API and stored data are preserved, but public pages make no counter requests. CMS, login, live registration/submissions, and leaderboards remain separate. This repository contains the public frontend with sample content; publishing real content and enabling backend features are separate steps.

## Public routes

| Route | Content |
| --- | --- |
| `/` | Full homepage with video placeholder, community introduction, previews, games, board, and partners |
| `/about` | Mission, vision, mascot placeholder, and AVP |
| `/events` and `/events/[slug]` | Three Figma sample events and detail pages |
| `/blogs` and `/blogs/[slug]` | Three sample stories and editable placeholder bodies |
| `/projects` and `/projects/[slug]` | Three placeholder projects with unavailable demo/source actions |
| `/team` | Executive/deputy selections and member grids |
| `/partners` | Ten supplied partner logos and contact CTA |
| `/contact` | Email and official community/social destinations |

Games opens `/#games`. Unknown detail slugs return 404. Placeholder destinations stay out of the sitemap and use `noindex, follow`. Sample event dates remain unchanged and are not presented as upcoming.

## Local setup

Use Node.js 22 or 24 LTS and pnpm **11.15.0** (also declared in `package.json`).

```powershell
pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
pnpm dev
```

Open [localhost:3000](http://localhost:3000). The public frontend works without backend credentials. Supabase values are needed only for the preserved counter API. Restart the server after changing environment variables.

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Hosted Supabase project URL |
| `SUPABASE_SECRET_KEY` | Secret server API key; never prefix it with `NEXT_PUBLIC_` |

Never commit `.env.local`, keys, tokens, or database passwords. Public pages do not read or write counter data. Existing saved totals and pending taps remain untouched.

## Build and verify

```powershell
pnpm lint
pnpm exec next typegen
pnpm exec tsc --noEmit
pnpm build
pnpm start
```

`next typegen` prepares route types for a fresh clone. TypeScript and lint checks run separately; a successful build is not a substitute for either. `pnpm audit --prod` checks shipped dependencies; `pnpm audit` also includes development tools.

Earlier dependency-audit findings are recorded in [release verification](docs/release-verification.md); rerun the audit commands above for current results. Next.js emits a Google Sans Flex fallback-metrics warning; the real font renders successfully.

## Supabase migrations

Use the existing intended project. Review its migration history and the dry run before applying anything:

```powershell
pnpm dlx supabase@2.121.0 login
pnpm dlx supabase@2.121.0 link --project-ref YOUR_PROJECT_REF
pnpm dlx supabase@2.121.0 migration list --linked
pnpm dlx supabase@2.121.0 db push --linked --dry-run --skip-vault
pnpm dlx supabase@2.121.0 db push --linked --skip-vault
pnpm dlx supabase@2.121.0 db advisors --linked --type security --level warn --fail-on error
```

The first migration creates the counter/rate-limit tables. The second adds durable queue checkpoints and idempotent batch functions. The release permissions migration restricts the hosted automatic-RLS helper when it exists. Additive updates preserve the current total; do not reset the hosted database or rerun the initialization SQL manually.

Counter tables have RLS enabled and are accessed only through the server secret role. Public/anonymous clients cannot execute the counter functions directly.

## Architecture and data flow

- Typed local records → server-rendered previews/listings/details → client interaction state → updated UI.
- Shared public layout supplies one main landmark, navigation, footer, and fonts on every public route.
- Carousel, games, board, video activation, and partner animation own only their interaction state.
- The preserved counter server/queue implementation is dormant in public pages.

The [counter guide](docs/sparks-counter.md) explains limits, API responses, recovery, and earlier isolated load measurements.

## Content, branding, and search

| Change | Edit |
| --- | --- |
| Official names, canonical address, metadata, social/profile URLs | `src/lib/site-config.ts` |
| Events, blogs, projects, navigation, video metadata | `src/content/public-content.ts` |
| Games and sample board members | `src/app/_home/home-config.ts` |
| Public font definitions | `src/app/fonts.ts` |
| Reusable logo source | `public/brand/gdg-mark.svg` |

The [customization guide](docs/customization.md) explains the data flow, responsive layout, image loading, and motion controls. Tailwind utilities remain the layout styling mechanism.

`pnpm brand:generate` regenerates checked-in favicon/icon variants and the static 1200 × 630 share image using existing tooling. It downloads the source Google Sans Flex font only during regeneration; builds and requests do not regenerate these images. See [brand assets](public/brand/README.md).

Search metadata identifies the official organization independently of the creative hero wording. The homepage includes Organization/WebSite JSON-LD and a self-canonical URL. The sitemap contains only `/`; placeholders use `noindex, follow`. Vercel preview/development builds disable indexing. Sample Figma events and the supplied “50+” statistic are retained as placeholders; no Event or Article structured data is generated.

## Production checklist

1. Use the Next.js framework preset with the lockfile and the normal build command. Install development dependencies during the build; the shadcn CSS import is build-time tooling.
2. Configure both Supabase variables as private production environment variables. Confirm migration parity and a clean security check before serving counter traffic.
3. Connect `www.gdgocplm.org`, ensure HTTPS works, and redirect the bare domain to the canonical `www` hostname in the hosting dashboard. DNS/hosting changes are separate from this repository.
4. Confirm `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, favicon, Apple icon, share image, canonical URLs, and all eight public page routes, nine sample detail routes, and unknown-slug 404 behavior on the deployed domain.
5. Check 1440px, 1920px, 768px, 393px, and 320px layouts, short landscape, enlarged text, keyboard activation, and reduced motion. Public pages should make no counter requests.
6. After deployment, verify ownership in Search Console and submit `https://www.gdgocplm.org/sitemap.xml`. Indexing and rankings are not immediate or guaranteed.

Pushing `main` may trigger the connected Vercel deployment. This repository does not install analytics or automate deployment, DNS changes, or Search Console submissions.

See [public frontend delivery](docs/public-frontend-delivery.md) for the current local checks and complete working-tree file inventory. The older [release verification](docs/release-verification.md) records the earlier metadata/counter release.
