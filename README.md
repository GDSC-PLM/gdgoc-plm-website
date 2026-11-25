# GDGoC PLM

Official website of **Google Developer Groups on Campus PLM**, the community at **Pamantasan ng Lungsod ng Maynila**.

Production: [www.gdgocplm.org](https://www.gdgocplm.org/). Built with Next.js App Router, React, TypeScript, Tailwind CSS, and Supabase.

The homepage features the interactive origami bird and a shared, buffered sparks counter. About, Events, Projects, Blogs, Team, Partners, and Contact currently share a branded placeholder and stay out of search until their content is ready. The local CMS has approved administrator access, typed content revisions, publication operations, and protected media storage and delivery. See the [CMS guide](docs/cms.md) for setup and the remaining editor and public page stages.

## Local setup

Use Node.js 22 or 24 LTS and pnpm **11.15.0** (also declared in `package.json`).

```powershell
pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
pnpm dev
```

Open [localhost:3000](http://localhost:3000) for the public site. For CMS work, follow the [local CMS setup](docs/cms.md#run-locally), use the local Supabase API, and open the app at [127.0.0.1:3000](http://127.0.0.1:3000). Restart the server after changing environment variables.

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase API URL for the sparks counter. Use the loopback URL during local development. |
| `SUPABASE_SECRET_KEY` | Secret server API key; never prefix it with `NEXT_PUBLIC_` |

Never commit `.env.local`, keys, tokens, or database passwords. The homepage works without backend credentials: a fresh counter shows unavailable rather than a fabricated total. Previously cached totals and locally saved taps remain on that browser.

## Build and verify

```powershell
pnpm lint
pnpm exec next typegen
pnpm exec tsc --noEmit
pnpm build
pnpm start
```

`next typegen` prepares route types for a fresh clone. TypeScript and lint checks run separately; a successful build is not a substitute for either. `pnpm audit --prod` checks shipped dependencies; `pnpm audit` also includes development tools.

Known tooling limitation at this release: the full audit reports [a `braces` advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) in ESLint/shadcn's development-only glob handling. The registry currently offers 3.0.3 and there is no published patch. Production dependencies pass their audit. Recheck before upgrading development tools; do not feed untrusted glob patterns into them. Next.js also emits a Google Sans Flex fallback-metrics warning; the real font loads successfully.

## Supabase migrations

CMS development uses only the local stack. Follow the [CMS migration and fixture steps](docs/cms.md#run-locally). The linked commands below document the existing counter deployment workflow.

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

- The Server Component homepage supplies artwork and copy to the client landing experience. Shared placeholder pages stay server-rendered and do not mount the interactive counter.
- Bird activation → IndexedDB local save → immediate rolling number/reaction → batch API request → atomic Supabase increment/checkpoint → reconciliation.
- One sender per browser queue coordinates tabs. Batches contain at most 10 taps; retries retain the same identity and sequence, preventing duplicate additions after lost responses.
- The anonymous HTTP-only cookie limits bursts, not unique people. IndexedDB retains pending taps; deleting site data or browser eviction can remove them. No email signup, analytics, or service worker is installed.

The [counter guide](docs/sparks-counter.md) explains limits, API responses, recovery, and earlier isolated load measurements.

## Content, branding, and search

| Change | Edit |
| --- | --- |
| Official names, canonical address, metadata, social/profile URLs | `src/lib/site-config.ts` |
| Visible homepage copy and artwork paths | `src/app/_landing/landing-config.ts` |
| Font shared by homepage and placeholders | `src/app/fonts.ts` |
| Shared placeholder presentation | `src/components/shared/page-template.tsx` |
| Reusable logo source | `public/brand/gdg-mark.svg` |

The [customization guide](docs/customization.md) retains exact spacing, colors, bird size, motion timing, milestones, and focus controls. The [artwork guide](public/landing/README.md) lists the original Figma exports. Tailwind utilities only: no CSS Modules, component stylesheets, or custom keyframes.

`pnpm brand:generate` regenerates checked-in favicon/icon variants and the static 1200 × 630 share image using existing tooling. It downloads the source Google Sans Flex font only during regeneration; builds and requests do not regenerate these images. See [brand assets](public/brand/README.md).

Search metadata identifies the official organization independently of the creative hero wording. The homepage includes Organization/WebSite JSON-LD and a self-canonical URL. The sitemap contains only `/`; placeholders use `noindex, follow`. Vercel preview/development builds disable indexing. No made-up events, reviews, statistics, or hidden keyword sections are added.

## Production checklist

1. Use the Next.js framework preset with the lockfile and the normal build command. Install development dependencies during the build; the shadcn CSS import is build-time tooling.
2. Configure both Supabase variables as private production environment variables. Confirm migration parity and a clean security check before serving counter traffic.
3. Connect `www.gdgocplm.org`, ensure HTTPS works, and redirect the bare domain to the canonical `www` hostname in the hosting dashboard. DNS/hosting changes are separate from this repository.
4. Confirm `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, favicon, Apple icon, share image, canonical URLs, and all eight public routes on the deployed domain.
5. Check 1440 × 686, 393px and 320px phones, short landscape, enlarged text, keyboard activation, and reduced motion. Mock API writes when testing bursts; do not inflate the public count.
6. After deployment, verify ownership in Search Console and submit `https://www.gdgocplm.org/sitemap.xml`. Indexing and rankings are not immediate or guaranteed.

Pushing `main` may trigger the connected Vercel deployment. This repository does not install analytics or automate deployment, DNS changes, or Search Console submissions.

See [release verification](docs/release-verification.md) for the final checks and complete file inventory.
