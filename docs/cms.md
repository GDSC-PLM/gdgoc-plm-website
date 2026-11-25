# Local CMS

Stages 1–5 provide administrator access, immutable revisions, fixed content types and media, an editor with private previews, and scheduled publishing with officer handover. The work starts from `12cbf39bf326c240635dd3c731f48bb0d6db5500` on `cms/local`. The approved items in `cms-functionality-catalog.md` define scope.

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

The placeholders let the local Auth service and provider-independent checks run without contacting Google. Fill `CMS_SUPABASE_PUBLISHABLE_KEY` and `CMS_SUPABASE_SECRET_KEY` in your ignored `.env.local` from the **local** stack's `supabase status` output. The server uses the secret for the sign-in budget and authorized Storage operations. Keep keys out of logs and version control. For the sparks counter use local values for its separate `SUPABASE_URL` and `SUPABASE_SECRET_KEY`, or leave both blank.

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
- **Hand over.** Invite a replacement or choose **Update active account permissions** to promote an existing contributor. Verify replacement access before revoking the outgoing account. Keep a second trusted full administrator for recovery. The last active full administrator cannot be demoted or revoked. Use the access screen's confirmation to revoke, then [assign and review each paused job](#stage-5-scheduled-publications).

```bash
psql 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' -v ON_ERROR_STOP=1
```

```sql
select cms_private.invite_operator_admin('replace-with-approved-google@example.invalid');
select action, actor_id, operator_name, target_email, occurred_at
from cms_private.audit order by id desc limit 20;
```

## Access boundaries and verification

The admin app uses Supabase Auth PKCE and HTTP-only session cookies scoped to `/admin`. The admission hook permits only a Google identity with a pending, unexpired exact-email invitation. After code exchange an authenticated RPC checks the Google OAuth session and verified provider email before binding the Auth UUID. Every protected app operation uses `requireCmsAccess`, which reads current database access. At the data boundary, content reads use `cms_can_edit(area)` and writes lock the actor's current access row and check the operation's permission. Access-management RPCs check full administrator status themselves.

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

## Stage 2 revision and publication contract

| Private relation | Purpose |
| --- | --- |
| `content` | Stable UUID and content area, with one current draft revision, an optional published revision and slug, and archive time. Composite foreign keys tie both pointers to this record. Slugs are unique among live records within an area. |
| `revisions` | Immutable UUID and per-record version, the complete title, slug and typed JSON fields, who saved it and when, and an optional source revision for restores. The JSON object is limited to 64 KiB. |
| `content_audit` | Append-only lifecycle events with actor, time, affected revision and prior live revision. Publication events store the operation UUID and its committed effect for retries. |
| `mutation_rate` | At most 60 committed content changes per approved actor per minute across create, save, restore, publish, unpublish and archive. Failed transactions and replayed publication operations consume no quota. |

### State transitions

| Operation | Expected state and result |
| --- | --- |
| Create | A contributor with area access or a full administrator creates an unpublished record and version 1. Title and slug may be incomplete. |
| Save or restore | Supply the draft UUID that was open. A row lock serializes writes. A stale request fails with HTTP 409 and the caller reloads. A successful write creates a new UUID and version. Restore copies a revision from the same record. The live pointer stays in place. |
| Publish | A full administrator supplies the exact draft UUID reviewed and the live UUID observed, or null if unpublished. The chosen revision needs a nonblank title, a valid slug, complete type-specific fields, and available media. The transaction updates the live pointer and slug and appends the audit. |
| Unpublish | Supply the expected live UUID. This clears public visibility and preserves the draft and all revisions. |
| Archive | Supply both the expected draft UUID and the observed live UUID or null. This clears public visibility, records archive time, and retains protected history. An archived record is read only. |

### Editor, scheduler and cache

The editor calls the server-only functions in `src/features/cms/server/content.ts`. Use `getCmsContent` to get the pointers, `getCmsRevision` to load a snapshot, and `listCmsRevisions` and `listCmsContentActivity` for protected history. History pages hold up to 50 entries. Use the last returned version or event ID as the next page's exclusive cursor. The editor uses `createCmsContent`, `saveCmsDraft` and `restoreCmsDraft` to write.

Call `applyCmsPublication` from a Server Action for manual publish, unpublish or archive. Supply a fresh operation UUID per confirmed operation, and reuse it with the same arguments if the response is lost. A successful call returns the record UUID, area, action, old and new slugs, and new live revision UUID. A successful replay returns the original effect even if publication has since changed. Reusing the UUID with different arguments fails.

The scheduler calls `cms_private.apply_publication` with the current approving officer, job UUID, pinned revision for publish, and expected live UUID. The transaction checks current publishing authority, applies the change and records its audit and queue outcome together. Manual and scheduled paths both call `invalidateCmsPublication` to expire the `cms-public` tag, sitemap and admin layout. The scheduler persists outstanding refreshes across process restarts.

The anonymous `cms_read_published` RPC filters on the current live pointer and archive status. Its Stage 2 projection includes only the record UUID, area, title and slug. The public read uses `no-store`. Stage 6 will connect public routes and any tagged projections to this contract.

### Stage 2 local checks

Apply the migration to the local Supabase stack, then run:

```bash
psql 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' -f supabase/tests/cms-revisions.sql
node supabase/tests/cms-revisions-concurrency.mjs
```

The SQL fixture runs on the local Supabase database and rolls back. It checks contributor boundaries, draft isolation, restore, pinned publication, idempotent replay, unpublish, archive, immutable audit and revision history, and the mutation limit. It forces an audit insert failure to demonstrate that the live pointer also rolls back. The concurrency check creates a disposable database on the local instance, waits for a second editor to block on the first editor's row lock, then checks that the second save returns a conflict after the first commits.

The migration and both fixtures passed on local Supabase PostgreSQL 17. A loopback Data API check also confirmed anonymous access to the published projection and denial of protected reads. Lint, route type generation, TypeScript and the isolated Next.js production build with local font fixtures passed.

## Stage 3 content types and media

The title and slug belong to each revision. The content UUID stays the same when they or an outbound URL change. New draft fields must use the fixed keys and types below. Omit unfinished fields from a draft. Publication requires the marked fields and a nonblank title plus a lowercase, hyphenated slug. A restore copies the exact snapshot and media references. A snapshot from before Stage 3 may need to be saved against the current schema before it can publish again.

| Area | Required for publication | Optional type-specific fields |
| --- | --- | --- |
| Events | `startsAt`, `mode`, `description`, image `cover`, `registrationUrl`. `venue` is required for in-person or hybrid events. | `endsAt` and a venue for online events. Times include a UTC offset or `Z`; the end cannot precede the start. |
| Blog and content | `category` of `project`, `past-event`, or `initiative`, and Markdown `body`. | Image `cover`. |
| Executive Board | Public name as title, `role`, and `bio`. | Image `photo`. Profiles have no administrator account field. |
| Partners and sponsors | `kind` of `partner` or `sponsor`, and `description`. | Image `logo` and HTTPS `websiteUrl`. |
| Zines | `issueLabel`, `releaseDate` as YYYY-MM-DD, `description`, and PDF `download`. | Image `cover`. |
| Haribots | Profile name as title and `description`. | Image `photo`. |
| FAQ | Question as title and Markdown `answer`. A full administrator approves it by publishing. | Common fields below. |
| External games | Title, `description`, `instructions`, and approved HTTPS `outboundUrl`. | Image `cover`. |

Common optional fields are `category` (free label outside blogs), `tags` and `topics` (up to 12 labels of up to 40 characters each), `statusLabel`, integer `sortOrder` from 0 to 9999, boolean `featured`, `metaTitle` (70 characters), `metaDescription` (170), and `socialImage`. The Settings area gets its own schema in Stage 6. The descriptors in `cms_private.content_schema` define field types and lengths. Stage 4 can load them using `getCmsContentSchema(area)` and use the field key supplied with database validation errors.

Registration accepts only HTTPS Google Forms (`forms.gle` and `docs.google.com/forms/`) and Luma (`lu.ma` and `luma.com`). Games accept HTTPS itch.io (the main host or one subdomain), `gd.games`, and `www.newgrounds.com/portal/view/` entries. Full administrators review the destination at publication. The CMS stores outbound links and never fetches them. Additional providers require a reviewed change to the allowlist.

### Media lifecycle and editor interface

- `cms_private.media` is an area-scoped reusable record with a stable UUID and an image or PDF kind. Each upload creates an immutable `media_versions` row with its own UUID, original filename, MIME, bytes, SHA-256 digest, uploader and time, plus image dimensions when applicable. Replacement keeps the record UUID and creates another file version of the same kind and area.
- Selection returns the latest version for up to 50 records via `listCmsMedia(area, afterId?)`. The editor stores an image as `{versionId, alt}`, with alt text up to 250 characters. An empty alt value marks a decorative image. Store a PDF as `{versionId}`. A revision pins that version and its per-use alt in `revision_media`, so the same image can have different alt text in another record. Historical and restored drafts keep their exact versions.
- Upload via `POST /admin/media?area=events`, with the file as the raw body, its MIME in `Content-Type`, and its percent-encoded filename in `X-File-Name`. Supply `&mediaId=<UUID>` for replacement. A successful upload returns the media and version IDs and file metadata. The request must come from the local app origin. Authorized attempts consume a budget of eight per actor per minute before the file is read.
- JPEG, PNG, and WebP accept up to 5 MiB and 4096 pixels per edge, with at most 12 megapixels. The server checks the signature and decodes and re-encodes the image as a still image, stripping embedded metadata. Zine PDFs accept up to 10 MiB and 200 pages. The server parses the PDF, rejects encrypted and interactive features such as scripts, launch actions, forms and embedded files, and serves accepted PDFs as attachments. This is file validation and does not include malware scanning. SVG, HTML, executable and other file formats are outside the allowlist.
- Storage uses the private `cms-media` bucket. Direct reads and writes, including signed URL creation, are blocked for anonymous and authenticated roles. The server validates bytes before storing a new object at the version UUID with overwrite disabled. Only the server role can record validated metadata, and the database rechecks current actor scope and the stored object. An interrupted upload can leave an unreferenced private object. Retained versions are never removed by the application.
- Use `GET /admin/media/<versionId>` for scoped preview and `GET /api/cms/media/<versionId>` for public delivery. The public route checks that a current published revision references the version. Both routes verify the stored digest before serving bytes and use `no-store`. Unpublishing or archiving the last live reference makes the file private on the next request. Stage 6 can use the public version URL without exposing a Storage URL or secret.

### Stage 3 local checks

Run with the local Stage 3 migration applied and the local Next.js app up:

```bash
psql 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' -f supabase/tests/cms-content-types.sql
psql 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' -f supabase/tests/cms-revisions.sql
node --env-file=.env.local supabase/tests/cms-media.mjs
```

The SQL checks roll back. The HTTP check generates its own small images and PDFs, uses real local fixture sessions and Storage, and archives its synthetic content. The retained test versions and audit history stay local and private.

The typed schema and revision fixtures passed on local Supabase. The HTTP check passed for wrong MIME, oversized images, unsupported and malformed files, disallowed PDF features, Storage isolation, exact-byte reuse and replacement, restored alt text, and PDF download and unpublish. Lint, route type generation, TypeScript, and an isolated production build with local font fixtures passed.

## Stage 4 editor and private preview

1. Sign in at `/admin` with an approved account or use the local fixture login above. Open a content area and select an existing item or **New draft**. Contributors see only their assigned areas. Full administrators see all eight content areas and **Manage administrator access** for invitations, permission changes and revocation. The database operator recovery procedure remains available in this guide.
2. Complete the fields you have and choose **Save draft**. Fields marked required for publication can be left unfinished on a draft. Incorrect values are shown next to the field. The Markdown toolbar inserts headings, emphasis, lists and HTTPS links. Preview rendering ignores raw HTML and does not render embedded Markdown images or scripts. Use the media fields for images and PDFs.
3. In a media field, select a reusable file or expand **Upload a file**. To keep the media ID while adding a version, select an existing file and choose **Upload as replacement**. Add alt text that describes the image in this use, or leave it blank for a decorative image. Save the draft to record the file selection and alt text.
4. Open **Preview saved draft** to review the last save. The preview banner identifies the revision. **History** links to earlier saved snapshots and lets an editor restore one as a new draft. Restoring keeps the existing published version. Preview is scoped to the signed-in account, uses the shared content renderer and private media route, is excluded from indexing, and sends `no-store`. The current public pages remain placeholders until Stage 6.
5. Full administrators can confirm **Publish**, **Unpublish**, or **Archive** from the saved editor state. **Cancel** and Escape close the confirmation. Publish checks the required fields and uses the shared transactional publication operation. Unpublish keeps the draft and history. Archive clears public visibility and makes the record read only, with review still available through the archived section.

The editor warns before following links or leaving with unsaved changes. On browsers that support session storage, a reload in the same tab under the same account can offer **Recover unsaved edits** if the saved revision has not changed. The copy contains form values and selected media IDs, so an unuploaded local file still needs to be selected again. Saving clears the copy. If another editor saved first, copy any text you need before reloading, then review the latest draft before reapplying it. Closing a tab can discard its recovery data.

### Stage 4 local checks

Apply the editor listing migration to local Supabase. From the repo root with the app running and local fixture Auth enabled:

```bash
node --env-file=.env.local supabase/tests/cms-editor.mjs
```

The browser fixture uses Chrome at `/usr/bin/google-chrome` by default. Set `CMS_TEST_CHROMIUM` to a different local Chromium executable if needed. It creates a synthetic content item and media, then archives the item and removes the temporary Auth accounts.

The Chrome workflow passed at desktop and mobile widths. It verified keyboard and confirmation focus, field errors, same-tab recovery, safe Markdown, file selection, private preview headers and anonymous denial, contributor scope, restore, publication confirmation, unpublish and archive. The media regression fixture, lint, route type generation, TypeScript, and the isolated production build with local font fixtures also passed.

## Stage 5 scheduled publications

1. Open a saved item as a full administrator and choose **Schedule publication**. Review the linked snapshot. Choose **Publish saved revision** or **Unpublish live revision**, enter the local date and time to the minute, and enter an IANA zone. The form starts with `Asia/Manila`. **Approve and schedule** records the officer, the revision and the resolved instant. The database rejects incomplete publications and times in the past.
2. During a daylight-saving gap the selected local minute does not exist. Choose another time. During a fold the minute occurs twice. Enter the desired UTC date and time with zone `UTC` to select an occurrence explicitly. The queue preserves the entered minute and zone alongside its fixed UTC instant.
3. Open **Scheduled publications** on the dashboard to see pending work. **Review revision** opens the exact approved snapshot. Later saved drafts need their own review and schedule to go live. If any publication action intervenes, the old job finishes as **Blocked**. A scheduled unpublish therefore cannot remove a replacement or a revision that someone took down and republished. Review the current state and create a fresh job if the change is still needed. **Cancel job** stops any pending or paused job.
4. Revoking or demoting an officer immediately unassigns their pending jobs. A full administrator selects a different active full administrator for each job and chooses **Assign administrator**. That officer reviews the pinned revision and chooses **Approve revision**. Assignment alone leaves the job paused. An overdue job becomes eligible on the next runner tick after reapproval. Cancel any job whose original timing or content is no longer appropriate.

### Run and observe the local scheduler

Start local Supabase and the app, apply the migrations, then run one of these commands in another terminal:

```bash
pnpm cms:scheduler
pnpm cms:scheduler --once
```

The first command polls every five seconds until interrupted. The second runs one pass with up to 25 due jobs and a cache refresh for up to 100 completed jobs. Use the existing `CMS_SUPABASE_URL` and local `CMS_SUPABASE_SECRET_KEY` from `.env.local`. The worker accepts only the loopback Supabase API. Its app target defaults to `http://127.0.0.1:3000`. Set `CMS_SCHEDULER_APP_PORT` when starting it against a different local app port. The queue survives shutdown. When the worker restarts it picks up eligible overdue work.

The terminal reports job IDs and outcomes. Open **View finished jobs** for executed, cancelled or blocked jobs. An exhausted mutation budget queues a retry after one minute. Unexpected database errors roll back the transaction. The worker checks the queue again on the next pass. When an app refresh fails, **Cache refresh pending** stays visible on the executed job. Restart the app with the same local key and run another pass. The worker retries invalidation, verifies a new value under the public cache tag, and acknowledges only the completed jobs it observed. Repeated refreshes are safe.

`cms_private.jobs` holds the target snapshot, live publication audit ID observed at approval, due instant, assignment, approval and cache-refresh state. Queue mutations and execution take the same transaction lock as access changes. A manual publication and a scheduled publication also lock the same content row. Whichever transition commits first determines what the next operation can do. The private publication audit has one execution row per job UUID. The queue and audit tables use RLS and narrow RPCs. Only the local server role can tick the queue or acknowledge a refresh.

A trusted local operator can inspect the two audit histories with a job UUID copied from the terminal or selected from `cms_private.jobs`:

```sql
\prompt 'Job UUID: ' job
select action, actor_id, operator_name, target_email, occurred_at, details
from cms_private.audit where details->>'job' = :'job' order by id;
select action, actor_id, occurred_at, revision_id
from cms_private.content_audit where operation_id = :'job'::uuid;
```

Use the affected officer's email to find the corresponding `revoke` or `update_permissions` access event. The same transaction records `schedule_unassigned` for each affected job. Subsequent `schedule_reassigned` and `schedule_reapproved` events identify the assigning and approving officers.

### Stage 5 local checks

```bash
node supabase/tests/cms-scheduler.mjs
node --env-file=.env.local supabase/tests/cms-schedule-ui.mjs
```

The database check creates and removes a disposable database on the local stack. It uses controlled instants and separate PostgreSQL sessions to exercise folds, gaps, pinning, stale unpublishing, access changes, cancellation, lock ordering, transaction failure and retry. The browser check uses the local fixture Auth setup and the running app. Run it on an idle fixture stack with the polling worker stopped. It schedules a synthetic item, revokes its approver, hands it over from a phone-sized viewport, and interrupts cache delivery between execution and acknowledgement. It archives its item and removes its temporary Auth users.

Both scheduling fixtures passed locally, including cache recovery against the production build. The Stage 1 access, Stage 2 revision and Stage 4 editor regressions, lint, route type generation and TypeScript checks also passed. Live Google sign-in remains deferred pending provider registration.

## Catalog traceability

Stage numbers identify the implementation and its checks. Public delivery and site settings are scheduled for Stage 6. Stage 7 reruns the integrated local checks.

| Catalog section | Included requirements | Stage and verification |
| --- | --- | --- |
| 1 | Create and edit structured records; save incomplete drafts; preserve published data while editing | 2–4 · `cms-revisions.sql` and `cms-revisions-concurrency.mjs`; typed forms arrive in stages 3–4 |
| 1 | Required-field errors; unsaved-change warning; Markdown body input; authenticated draft preview; restore earlier revision as new draft | 4 · `cms-editor.mjs` exercises the browser workflow |
| 2 | Events with dates, venue/mode, description, cover and approved registration link; blog entries including Projects, Past Events and Initiatives; Executive Board; partners and sponsors; Zines and downloads; Haribots; approved FAQ; external game title, description, instructions and approved URL | 3–4 · `cms-content-types.sql` covers schemas; Stage 4 connects the editor |
| 2 | Reusable media; stable content/media IDs across title, slug and URL changes; categories, tags, topics and labels | 2–4, 6 · `cms-content-types.sql`, `cms-revisions.sql` and `cms-media.mjs` cover schemas, IDs and reuse |
| 3 | Draft and published states; confirmed publish and unpublish; published-only public reads; editing does not change live data; archived records hidden with history; contributors draft and full administrators publish | 2, 4, 6 · `cms-revisions.sql` verifies transitions and projection; `cms-editor.mjs` covers confirmations and role behavior; public page checks arrive in Stage 6 |
| 3 | Zoned publish/unpublish scheduling and cancellation; approved revision pinned; later edits require renewed approval; revoked approver jobs unassigned and paused; authorized reassignment and approval; audit for all transitions; retry safety; shared publication operation | 2, 5 · `cms-revisions.sql`, `cms-scheduler.mjs` and `cms-schedule-ui.mjs` cover the operation, concurrent transitions, handover, local runner and cache recovery |
| 3 | Revision history with actor and time; complete immutable revisions including referenced media; administrative audit | 1–5 · access and revision fixtures verify snapshots and audit; `cms-media.mjs` verifies file replacement and restoration |
| 4 | Google OAuth; no public registration; explicit approval; server authorization; existing session revocation; full and scoped roles; separate editing and publication; invitation, expiry, recovery and handover | 1, 5 · `cms-access.sql`, `cms-local-signin.mjs --verify`, and both Stage 5 checks cover account and queue handover. Google activation and live round trip deferred |
| 5 | Image upload and selection; metadata and per-use alt text; size/type/content validation; private draft media; public published media; replacement preserves published media; PDF and Zine downloads | 3–4, 6 · `cms-media.mjs` and `cms-content-types.sql` cover validation, storage isolation, replacement and download |
| 6 | Existing templates for published data; stable human-readable slugs; applicable filters and sorting; bounded pages; minimal public query fields; ordering and featured records; empty, unavailable and 404 states | 6 · local page, filtering, pagination, outage and data exposure fixtures |
| 6 | Responsive and keyboard access; content canonical, titles, descriptions and shares; published-only sitemap and indexing; redirects; authenticated preview and banner; cache lifetime and refresh | 4, 6–7 · browser walkthrough, metadata/sitemap, redirect, preview and cache checks |
| 7 | Draft/publish/preview for navigation, footer and contact, social links and order, homepage text and featured content; menu changes preserve route destinations | 6 · settings snapshot, preview authorization, ordering and route continuity fixtures |
| 8 | Validate and authorize server input; least-privilege table and storage policies; keep keys out of browser and logs; actor/time audit; rate limits for sign-in, uploads and mutations | 1–7 · access fixture, scoped input and grants checks, upload/mutation limits and bundle/output inspection |
