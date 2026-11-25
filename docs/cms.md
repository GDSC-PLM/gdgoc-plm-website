# Local CMS

The CMS is implemented in numbered stages. Stage 1 adds administrator access and the local foundation. Content publication comes in later stages. The work starts from `12cbf39bf326c240635dd3c731f48bb0d6db5500` on `cms/local`. The approved items in `cms-functionality-catalog.md` define scope.

## Run locally

Use Node.js and pnpm as described in the README, Docker available to the current user, the Supabase CLI and the `psql` command. Run the commands from the repository root. Confirm the expected local ports (3000 for the app, 54321 for the Supabase API and 54322 for the database) belong to this checkout before using an already running stack.

```bash
pnpm install --frozen-lockfile
# Use only in a fresh checkout. Review an existing .env.local locally before running the app.
cp -n .env.example .env.local
export SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=local-fixtures-only
export SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=local-fixtures-only
supabase start
supabase migration up --local
```

If the stack was started before the CMS Auth configuration was added, stop and start this checkout's local stack to load the Google provider and admission hook. Keep the existing database volumes.

The placeholders let the local Auth service and provider-independent checks run without contacting Google. Fill `CMS_SUPABASE_PUBLISHABLE_KEY` and `CMS_SUPABASE_SECRET_KEY` in your ignored `.env.local` from the **local** stack's `supabase status` output. The secret is used by the server exclusively for the sign-in budget RPC. Keep keys out of logs and version control. For the sparks counter use local values for its separate `SUPABASE_URL` and `SUPABASE_SECRET_KEY`, or leave both blank.

```bash
pnpm dev --hostname 127.0.0.1
```

Open [the local admin page](http://127.0.0.1:3000/admin). Use the exact loopback origin throughout OAuth so PKCE cookies remain available. CMS configuration accepts the local API URL `http://127.0.0.1:54321`. The additive migration preserves counter tables and migration history. Fixture checks roll back their transaction.

### Sign in with a dummy account for local testing

Google registration is deferred for this test cycle. Start the app and run one of these commands from the repository root with the local Supabase publishable and secret keys in `.env.local`:

```bash
node --env-file=.env.local supabase/tests/cms-local-signin.mjs
node --env-file=.env.local supabase/tests/cms-local-signin.mjs contributor
```

Open the one-time loopback link printed by the command in the browser where you want to test. The default role is full administrator. The contributor can edit Events. The helper listens on `127.0.0.1:3399` until the link is used or five minutes pass. It creates synthetic accounts on the local stack. Sign out when finished, and revoke an old demo account through the access screen when it is no longer needed.

The helper needs a local Auth service with email/password enabled so it can sign in to an operator-created fixture. For a fresh fixture stack, use a local copy of the configuration with `[auth] enable_signup = false`, `[auth.email] enable_signup = true`, `[auth.external.google] enabled = false`, and `[auth.hook.before_user_created] enabled = false`. Apply the same repository migrations. The global signup setting keeps Auth registration closed while the operator creates fixtures. Keep the checked-in configuration for the provider flow. The helper uses the trusted local database operator to attach synthetic Google identity data to an actual Supabase session, then hands its signed session to the browser through an HTTP-only cookie. It runs separately from Next.js. All CMS role, scope and revocation checks still apply.

With Next.js running, use `node --env-file=.env.local supabase/tests/cms-local-signin.mjs --verify` for the repeatable HTTP and RPC checks. This mode removes its own fixtures when it finishes.

### Exercise Google manually when provider access is available

For an explicitly local Google OAuth client, register `http://127.0.0.1:54321/auth/v1/callback` with Google. Pass that client's credentials as the two `SUPABASE_AUTH_EXTERNAL_GOOGLE_*` variables before starting the local stack. The local Auth service redirects back to `http://127.0.0.1:3000/admin/auth/callback`. After the operator creates an invitation, use **Continue with Google** and select the exact invited account.

Google app registration, activation of the provider configuration, and the live Google round trip are deferred. After registration, use the checked-in OAuth configuration and complete a full sign-in with an invited identity and a denied sign-in with an uninvited identity. See the [Supabase Google setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-google) and [admission hook](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook).

## Provisioning, recovery and handover

- **First full administrator.** Connect directly to the local database as the trusted database operator and run the statement below, replacing the example address with the officer's approved Google email. The invitation lasts 24 hours. The officer opens the local administrator sign-in and signs in before expiry. The database audit records the operator role and time.
- **Invite or renew.** A full administrator opens **Manage administrator access**, enters the exact Google email, chooses a role and sets a deadline from 1 to 30 days. For a contributor, select the areas they can edit. Give the link to the approved officer directly. Saving an invitation for the same unbound address renews it. Cancel a pending invitation from its row.
- **Recover access.** For a still active approved account, recover the Google account with its provider, then sign in again. If an identity is permanently lost or compromised, use another verified Google address. A remaining full administrator can invite it. If none can sign in, the trusted database operator uses the bootstrap procedure for the replacement. A previously revoked identity stays revoked, including in existing sessions. The same address cannot be granted again after revocation.
- **Hand over.** Invite a replacement or choose **Update active account permissions** to promote an existing contributor. Verify replacement access before revoking the outgoing account. Keep a second trusted full administrator for recovery. The last active full administrator cannot be demoted or revoked. Use the access screen's confirmation to revoke and inspect the local audit when needed. Stage 5 will connect revocation to scheduled jobs.

```bash
psql 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' -v ON_ERROR_STOP=1
```

```sql
select cms_private.invite_operator_admin('replace-with-approved-google@example.invalid');
select action, actor_id, operator_name, target_email, occurred_at
from cms_private.audit order by id desc limit 20;
```

## Access boundaries and verification

The admin app uses Supabase Auth PKCE and HTTP-only session cookies scoped to `/admin`. The admission hook permits only a Google identity with a pending, unexpired exact-email invitation. After code exchange an authenticated RPC checks the Google OAuth session and verified provider email before binding the Auth UUID. Every protected app operation uses `requireCmsAccess`, which reads current database access. Future content RPCs and policies use `cms_can_edit(area)` and `cms_can_publish()` for independent enforcement at the data boundary. Access-management RPCs check full administrator status themselves.

The access, audit and sign-in budget tables are private with RLS and no public policies. Only narrow RPCs are granted to the roles that need them. Public visitors have no sign-in or signup flow. Contributors edit only assigned areas. Full administrators can edit all areas, publish and manage access. The local app limits Google sign-in starts to 30 per minute across the instance. Supabase Auth also applies its own Auth endpoint limits.

Run the database fixture with the local stack started and migrated:

```bash
psql 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' -f supabase/tests/cms-access.sql
pnpm lint
pnpm exec next typegen
pnpm exec tsc --noEmit
```

The SQL fixture checks admission, expiry, cancellation, verified identity binding, least privilege, contributor scope, publication permission, handover, revocation with the same session claims, audit and the sign-in budget. Its claims are fixture inputs.

The additive migration and access fixtures passed on the local Supabase PostgreSQL 17 database. Lint, route type generation, TypeScript and the production build with local font fixtures passed. Loopback HTTP checks passed for anonymous admin redirects, response cache and indexing headers, the callback without a code, and access to the public home page. The one-time fixture link issued an HTTP-only session cookie. Local HTTP and RPC checks confirmed full administrator access, unapproved identity denial, contributor isolation and revocation with the same session. The local test cycle uses fixture sessions while Google registration is pending.

## Catalog traceability

Stage numbers identify the planned implementation and the checks that should prove it. Scheduled and content checks below are pending until their stage lands. Stage 7 reruns the integrated local checks.

| Catalog section | Included requirements | Stage and verification |
| --- | --- | --- |
| 1 | Create and edit structured records; save incomplete drafts; preserve published data while editing | 2–4 · revision isolation fixtures and editor walkthrough |
| 1 | Required-field errors; unsaved-change warning; Markdown body input; authenticated draft preview; restore earlier revision as new draft | 4 · invalid/unsaved editor walkthrough, preview authorization and restore fixtures |
| 2 | Events with dates, venue/mode, description, cover and approved registration link; blog entries including Projects, Past Events and Initiatives; Executive Board; partners and sponsors; Zines and downloads; Haribots; approved FAQ; external game title, description, instructions and approved URL | 3–4 · each record type validated and editable through fixtures |
| 2 | Reusable media; stable content/media IDs across title, slug and URL changes; categories, tags, topics and labels | 2–4, 6 · revision, relationship and URL change fixtures |
| 3 | Draft and published states; confirmed publish and unpublish; published-only public reads; editing does not change live data; archived records hidden with history; contributors draft and full administrators publish | 2, 4, 6 · publication transaction, state transition and rendered public fixtures |
| 3 | Zoned publish/unpublish scheduling and cancellation; approved revision pinned; later edits require renewed approval; revoked approver jobs unassigned and paused; authorized reassignment and approval; audit for all transitions; retry safety; shared publication operation | 5 · due-job, pinned revision, revocation, reassignment and idempotent retry fixtures against the same publisher |
| 3 | Revision history with actor and time; complete immutable revisions including referenced media; administrative audit | 1–5 · access audit fixture, immutable snapshot and publication audit checks |
| 4 | Google OAuth; no public registration; explicit approval; server authorization; existing session revocation; full and scoped roles; separate editing and publication; invitation, expiry, recovery and handover | 1, 5 · `supabase/tests/cms-access.sql` and `supabase/tests/cms-local-signin.mjs --verify`; Google activation and live round trip deferred |
| 5 | Image upload and selection; metadata and per-use alt text; size/type/content validation; private draft media; public published media; replacement preserves published media; PDF and Zine downloads | 3–4, 6 · file rejection, storage isolation, replacement and published download fixtures |
| 6 | Existing templates for published data; stable human-readable slugs; applicable filters and sorting; bounded pages; minimal public query fields; ordering and featured records; empty, unavailable and 404 states | 6 · local page, filtering, pagination, outage and data exposure fixtures |
| 6 | Responsive and keyboard access; content canonical, titles, descriptions and shares; published-only sitemap and indexing; redirects; authenticated preview and banner; cache lifetime and refresh | 4, 6–7 · browser walkthrough, metadata/sitemap, redirect, preview and cache checks |
| 7 | Draft/publish/preview for navigation, footer and contact, social links and order, homepage text and featured content; menu changes preserve route destinations | 6 · settings snapshot, preview authorization, ordering and route continuity fixtures |
| 8 | Validate and authorize server input; least-privilege table and storage policies; keep keys out of browser and logs; actor/time audit; rate limits for sign-in, uploads and mutations | 1–7 · access fixture, scoped input and grants checks, upload/mutation limits and bundle/output inspection |
