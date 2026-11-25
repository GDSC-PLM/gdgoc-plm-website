# Local CMS acceptance

Local acceptance recorded on 2026-11-25, Asia/Manila. The scope is the 70 included items and three nested scheduling requirements in `cms-functionality-catalog.md` under `cms-plan-2026-11-11`. The operating guide covers setup, editor workflows, officer handover, scheduler recovery and cache behavior. [CMS guide](cms.md)

## Repeat the checks

Use the repository's Node and pnpm versions, Docker, the Supabase CLI, `psql`, and Chrome or Chromium. Install dependencies with `pnpm install --frozen-lockfile`. Run from the repository root:

```bash
pnpm cms:acceptance
```

The runner copies Git-tracked files from the working tree and builds in a temporary directory. Stage any newly added acceptance inputs before running it. It starts a unique disposable Supabase project and production app on loopback. The app uses port 3417, the API 55421, the database 55422, and the one-time fixture sign-in helper 3399. Those ports must be free. Set `CMS_TEST_CHROMIUM` if Chrome is installed somewhere other than `/usr/bin/google-chrome`. The runner uses temporary local API keys, checked-in font response fixtures and synthetic test data. It removes its volumes and temporary copy at the end. The normal CMS stack can keep running.

For individual checks, the guides below show the default ports. The acceptance runner wires `CMS_TEST_APP_PORT` and `CMS_TEST_DB_PORT` for the isolated stack. It keeps global Auth signup closed and permits the trusted operator to create email fixtures. The test tool attaches synthetic verified Google identity metadata to real Supabase sessions. The regular Google provider entry, callback and admission hook remain in the application setup. [Local setup and manual Google check](cms.md#exercise-google-manually-when-provider-access-is-available)

## Acceptance record

The run used Node.js 24.16.0, pnpm 11.15.0, Next.js 16.3.8, Supabase CLI 2.109.0, PostgreSQL 17.6 and Chrome 158.

| Check | Local evidence |
| --- | --- |
| Clean installation | Disposable Supabase project applied all nine tracked migrations. Startup asserted zero CMS records and zero access rows before fixtures ran. |
| Build and static checks | `pnpm lint`, `pnpm exec next typegen`, `pnpm exec tsc --noEmit`, and `pnpm build` passed. The Turbopack build used local responses for font compilation and emitted the Google Sans Flex fallback-metrics warning. |
| Combined editor workflow | Contributor signed in, saved an incomplete Events draft, uploaded and selected an image, and opened scoped preview. Anonymous requests returned 404 for the draft and image. A full officer published via confirmation. Chrome rendered the detail and its image. Restoring revision 1 left the live pointer and image in place. Unpublish returned 404 for both, and archive retained the previewable revision history. Signing out redirected protected preview to sign-in. |
| Queue workflow | Separate database sessions verified one execution audit row under contention, rollback after a forced failure, pinned revision, cancellation, stale unpublish protection, timezone validation and officer handover. The browser workflow recovered cache invalidation after an execution committed while the app was unavailable. |
| Public and settings workflow | Chrome and direct HTTP requests exercised all included templates, metadata, canonical and old URLs, mobile navigation, pagination, a settings draft over a prior publication, exact media references, sitemap and scheduled unpublish. |
| Baseline and unavailable state | The configured app served the original routes and assets. The real local sparks endpoint rejected cross-origin taps and counted an accepted tap once across a replay. Chrome also exercised the original homepage interaction against mocked responses. A separate app process without backend configuration showed unavailable content and counter states. |
| Browser key check | Browser-delivered HTML, metadata files, 18 built client assets and runtime app logs passed the scan for the configured disposable secret key. |
| Commit chain | Seven stage commits on `cms/local` descend directly from `12cbf39bf326c240635dd3c731f48bb0d6db5500`. Inspect raw identities and bodies using the commands below. |

The live Google provider round trip remains pending registration and activation. Local verification covers the SQL admission hook, expired and cancelled invitations, verified-identity binding, signup denial, the callback without a code, signed browser sessions, permission checks, sign-out and already-issued session revocation. No production site, hosted Supabase, or external provider was used to run acceptance. The visual checks cover the exercised viewports and keyboard paths.

```bash
git branch --show-current
git status --short --branch
git log --reverse --format='%H%n%P%nAuthor %an <%ae>%nCommitter %cn <%ce>%n%n%B' 12cbf39bf326c240635dd3c731f48bb0d6db5500..HEAD
```

The raw history shows the approved author and committer on every stage, a Conventional Commits subject, a substantive body after a blank line, and no attribution trailers. Earlier checkpoints are identified by their full hashes:

| Stage | Checkpoint |
| --- | --- |
| 1 | `c5b03cbe847f6ac5337f7c22230c939d593d05a4` |
| 2 | `535b9db8360b8b1140a3ad5bfc078e81e131a52e` |
| 3 | `b56aecd70b9c855b275bccdb8c1469b3c0a87159` |
| 4 | `8c67553f1d3d9d17e1deacbbcc2d891a197828aa` |
| 5 | `78c8bc8f50f58933af7d6cdcd28c9d8384cd4bcb` |
| 6 | `fc442070a915c2b3d2b098a0799674f371e48317` |
| 7 | The commit introducing this record, shown by `git log -1 --diff-filter=A --format=%H -- docs/cms-acceptance.md` |

## Catalog checklist

Rows follow the order of the included items within each section. Stages identify implementation. Evidence files are under [supabase/tests](../supabase/tests). The Stage 7 runner executes the listed fixtures on the same disposable stack.

### 1. Content creation and editing

| Requirement | Stage | Reviewable evidence |
| --- | --- | --- |
| 1.1 Create and edit structured records | 2–4 | `cms-editor.mjs` creates an Events item and saves typed event fields. |
| 1.2 Save incomplete work as a draft | 2–4 | `cms-editor.mjs` saves a title and slug before entering required fields. |
| 1.3 Preserve the live revision while editing | 2, 4 | `cms-revisions.sql` checks separate draft/live pointers. `cms-editor.mjs` checks live content and image after restore. |
| 1.4 Required fields and field errors | 3–4 | `cms-content-types.sql` rejects incomplete publication. `cms-editor.mjs` checks slug and registration field errors and `aria-invalid`. |
| 1.5 Unsaved-change warning | 4 | `cms-editor.mjs` cancels navigation at the warning, reloads and recovers the unsaved tab edits. |
| 1.6 Safe Markdown and formatting toolbar | 4 | `cms-editor.mjs` uses Bold and checks rendered emphasis, absence of authored HTML attributes, unsafe URLs, iframes and Markdown embeds. The renderer uses an element allowlist in `cms-article.tsx`. |
| 1.7 Preview a draft before publishing | 4, 6 | `cms-editor.mjs` opens the saved draft and checks private headers and scope. |
| 1.8 Restore an earlier revision as a new draft | 2, 4 | `cms-revisions.sql` checks distinct revision ID, source and unchanged live pointer. `cms-editor.mjs` exercises the restore button. |

### 2. Content types and relationships

| Requirement | Stage | Reviewable evidence |
| --- | --- | --- |
| 2.1 Events with dates, venue or mode, description, cover and approved registration | 3–4, 6 | `cms-content-types.sql` checks date ordering, hybrid venue and approved provider rules. `cms-public.mjs` renders the event and cover. |
| 2.2 Blog entries including Projects, Past Events and Initiatives | 3–4, 6 | `cms-content-types.sql` validates category values. `cms-public.mjs` opens the project, recap and initiative detail routes. |
| 2.3 Executive Board profiles separate from administrator accounts | 1, 3–4, 6 | `cms-public.mjs` creates and renders a Board profile through content RPCs. `cms-access.sql` exercises the separate membership and invitation tables. |
| 2.4 Partners and sponsor profiles | 3–4, 6 | `cms-content-types.sql` exercises the partner/sponsor choice and `cms-public.mjs` renders a sponsor. |
| 2.5 Zine issues and downloads | 3–4, 6 | `cms-media.mjs` validates and compares downloaded PDF bytes. `cms-public.mjs` opens a Zine and checks attachment delivery. |
| 2.6 Haribot profiles | 3–4, 6 | `cms-content-types.sql` validates profile fields. `cms-public.mjs` previews and publishes a Haribot. |
| 2.7 Approved FAQ entries | 3–4, 6 | `cms-public.mjs` verifies a question returns 404 before approval and renders after publication. |
| 2.8 External games with title, description, instructions and approved URL | 3–4, 6 | `cms-content-types.sql` validates game links and required fields. `cms-public.mjs` previews, publishes and archives a directory record. |
| 2.9 Reusable media records | 3–4 | `cms-media.mjs` reuses one version across two records, with different per-use alt text. |
| 2.10 Stable content and media IDs | 2–3, 6 | `cms-revisions.sql` keeps the content UUID through slug changes. `cms-media.mjs` keeps the media UUID across versions. `cms-public.mjs` follows a stable-ID featured link after rename. |
| 2.11 Categories, tags, topics and status labels | 3–4, 6 | `cms-content-types.sql` covers typed taxonomy and invalid values. Editor fields derive from the schema and the article renderer displays categories, status, tags and topics. |

### 3. Publishing and content lifecycle

| Requirement | Stage | Reviewable evidence |
| --- | --- | --- |
| 3.1 Draft and published states | 2, 4 | `cms-revisions.sql` checks both revision pointers and `cms-editor.mjs` exercises status changes. |
| 3.2 Publish and unpublish with confirmation and result | 4 | `cms-editor.mjs` cancels and confirms both actions and checks success messages and database state. |
| 3.3 Published-only visitor access | 2, 6 | `cms-public.mjs` checks direct draft detail and revision RPC denial, then a successful published page. |
| 3.4 Draft changes stay private until publication | 2–4, 6 | `cms-public.mjs` verifies that a new event slug and replacement image stay private before publish. |
| 3.5 Archive hides content and retains history | 2, 4, 6 | `cms-revisions.sql` checks retained snapshots and audit. `cms-editor.mjs` checks protected preview remains and public detail returns 404. |
| 3.6 Contributors draft and full administrators review and approve | 1–2, 4 | `cms-revisions.sql` denies contributor publication. `cms-editor.mjs` exercises contributor save and full officer review. |
| 3.7 Zoned scheduled publish/unpublish and cancellation | 5 | `cms-scheduler.mjs` checks Manila, UTC, nonexistent and ambiguous local times, expected live state and cancellation. `cms-schedule-ui.mjs` uses the admin controls. |
| 3.7a Pin the approved immutable revision | 2, 5 | `cms-scheduler.mjs` saves a newer draft, executes the job, and asserts the earlier live UUID and newer draft UUID. |
| 3.7b Pause jobs after loss of authority and require reassignment and reapproval | 5 | `cms-scheduler.mjs` checks revoke and demotion, invalid assignees, a paused assigned job and approval restricted to its new officer. |
| 3.7c Audit handover and deduplicate execution on retry | 5 | `cms-scheduler.mjs` asserts actor IDs and times for revoke, unassignment, reassignment and reapproval. Concurrent execution and worker replay leave one execution row in `cms-scheduler.mjs` and `cms-schedule-ui.mjs`. |
| 3.8 Shared publishing operation | 2, 5 | Manual and scheduled SQL call `cms_private.apply_publication`. The revision and scheduler fixtures check the shared requirements for role, target and operation ID. |
| 3.9 Revision history with who and when | 2, 4 | `cms-revisions.sql` checks immutable saved and publication history. `cms-editor.mjs` reaches the historical preview. |
| 3.10 Complete immutable content and media snapshots | 2–3 | `cms-revisions.sql` denies snapshot mutation. `cms-media.mjs` compares bytes and alt text across replacement and restoration. |
| 3.11 Administrative audit log | 1–2, 5 | Access, revision and scheduler SQL fixtures check actor/operator, timestamp, action and retained audit events. |

### 4. Administrator accounts and access control

| Requirement | Stage | Reviewable evidence |
| --- | --- | --- |
| 4.1 Administrator Google OAuth | 1 | Provider, PKCE entry and callback are wired in the checked-in config and admin routes. The SQL and signed-session checks passed locally. Live provider code exchange remains deferred. |
| 4.2 No public self-registration | 1 | `cms-acceptance.mjs` checks 404 on signup and denial from local Auth. `cms-access.sql` checks the normal hook rejects email signup and uninvited Google identities. |
| 4.3 Explicit approved identity provisioning | 1 | `cms-access.sql` requires a verified email and valid invitation. `cms-local-signin.mjs --verify` sees denial before operator approval and access after binding. |
| 4.4 Server authorization on protected reads and writes | 1–6 | Access and revision fixtures check denied RPCs. Editor, media, scheduler and public fixtures exercise scoped routes and isolation from unauthenticated requests. |
| 4.5 Prompt existing-session revocation | 1, 5 | `cms-local-signin.mjs --verify` uses the same signed session after revocation and observes denial. |
| 4.6 Full administrator role | 1 | `cms-access.sql` checks operator bootstrap and publishing and settings privileges for an activated officer. |
| 4.7 Area-scoped contributors | 1–4 | `cms-local-signin.mjs --verify` allows Events and denies Blogs. `cms-editor.mjs` checks the same boundary in Chrome. |
| 4.8 Distinct editing and publishing permissions | 1–2, 4 | `cms-revisions.sql` rejects a direct contributor publication call. `cms-editor.mjs` shows draft editing with no publish control for the contributor. |
| 4.9 Invitation, expiry, recovery and handover | 1, 5 | `cms-access.sql` checks invitation expiry, cancellation, reissue, replacement activation and last-admin protection. `cms-scheduler.mjs` checks paused work transfer. The guide records Google recovery and trusted operator bootstrap. |

### 5. Media and files

| Requirement | Stage | Reviewable evidence |
| --- | --- | --- |
| 5.1 Upload and select images | 3–4 | `cms-editor.mjs` uploads, selects and previews the image in Chrome. |
| 5.2 File metadata and per-use alt | 3–4 | `cms-media.mjs` verifies file identity and per-revision alt across reuse and restore. The schema stores filename, MIME, byte count, SHA-256 and image dimensions. |
| 5.3 Validate file size, type and bytes before publish | 3 | `cms-media.mjs` rejects oversized and invalid images, wrong types, unsafe PDFs and unsupported formats. `cms-content-types.sql` rejects a draft reference to an unknown version. Publication rechecks the stored object against the validated metadata. |
| 5.4 Restrict draft media | 3–4 | `cms-media.mjs` checks anonymous, out-of-scope and direct Storage denial alongside authorized private delivery. |
| 5.5 Deliver only publicly referenced media | 3, 6 | `cms-editor.mjs` and `cms-public.mjs` check 404 before publish and after removal of the last live reference. |
| 5.6 Preserve published media across replacement | 3, 6 | `cms-media.mjs` and `cms-public.mjs` compare old public bytes while the replacement stays private. |
| 5.7 PDF and Zine downloads | 3–4, 6 | `cms-media.mjs` checks parsed PDF bytes and attachment headers. `cms-public.mjs` exercises the rendered Zine record. |

### 6. Public website delivery

| Requirement | Stage | Reviewable evidence |
| --- | --- | --- |
| 6.1 Published records in the public site templates | 6 | `cms-public.mjs` opens detail pages across all nine collections with approved records. It also opens every associated private preview. |
| 6.2 Stable readable detail slugs | 2, 6 | `cms-public.mjs` opens human-readable event paths and follows the same content UUID through a slug change. |
| 6.3 Useful filters and sorting | 6 | `cms-public.mjs` selects initiatives and checks event projections. The SQL list function applies event timeframe and date sort, blog category, and partner kind before pagination. |
| 6.4 Minimal public fields with no private data | 2, 6 | `cms-public.mjs` checks the anonymous list projection has no snapshot, actor or revision ID and the private revision projection returns no data. Read grants and article field allowlist are in the delivery migration. |
| 6.5 Pagination and page limits | 6 | `cms-public.mjs` checks 12 items and the next page. The SQL query caps the returned rows to 13 including the next-page lookahead and clamps the page range. |
| 6.6 Featured and manual ordering | 6 | `cms-public.mjs` pages across featured, manually ordered FAQ fixtures and checks a stable-ID featured link on the homepage. |
| 6.7 Empty, unavailable and missing states | 6 | `cms-acceptance.mjs` checks baseline empty collections and missing routes, then runs against an app without backend configuration. `cms-public.mjs` checks direct detail 404s. |
| 6.8 Responsive layout and keyboard access | 4, 6 | `cms-editor.mjs` checks keyboard focus, Escape and mobile sizing. `cms-public.mjs` checks skip-link focus, navigation and absence of horizontal overflow in Chrome. |
| 6.9 Content-specific canonical, title, description and sharing image | 6 | `cms-public.mjs` checks all four against a published event and its versioned media. |
| 6.10 Published-only sitemap and indexing | 6 | `cms-public.mjs` checks canonical inclusion and alias/admin exclusion, then scheduled removal. `cms-acceptance.mjs` checks noindex for empty and unavailable views. |
| 6.11 Redirect superseded public URLs | 6 | `cms-public.mjs` checks a 308 to the new event URL, then 404 for both paths after scheduled unpublish. |
| 6.12 Preview route and banner | 4, 6 | `cms-public.mjs` checks private banner and headers on all included types. `cms-editor.mjs` checks unauthenticated denial and protected history preview. |
| 6.13 Cache lifetime and publication refresh | 2, 5–6 | `cms-public.mjs` checks public no-store, manual replacement and scheduled disappearance. `cms-schedule-ui.mjs` verifies recovery after an interrupted refresh. The live lookup gates the 300-second revision cache. |

### 7. Navigation, site settings and branding

| Requirement | Stage | Reviewable evidence |
| --- | --- | --- |
| 7.1 Approved navigation label, link, order and visibility | 6 | `cms-public.mjs` saves visible and hidden destinations and checks the rendered label and row order. The settings validator restricts destinations to the route registry. |
| 7.2 Footer links and contact information | 6 | `cms-public.mjs` saves both and checks the footer and contact page. |
| 7.3 Official social links and order | 6 | `cms-public.mjs` reverses the default order and checks the resulting markup. The validator matches each official platform host. |
| 7.4 Homepage text and featured content | 6 | `cms-public.mjs` previews and publishes changed copy and a featured event. The link follows the live slug and disappears when unpublished. |
| 7.5 Menu changes preserve destinations | 6 | `cms-public.mjs` hides Blogs in the menu, then successfully requests `/blogs` directly. |
| 7.6 All settings draft/preview, with live settings intact | 2, 6 | `cms-public.mjs` saves the settings before publishing, checks the live homepage and contact output, then saves a second version and checks the original published wording and links remain. |

### 8. Security, privacy and records

| Requirement | Stage | Reviewable evidence |
| --- | --- | --- |
| 8.1 Server-side validation and authorization | 1–6 | SQL fixtures assert denied calls outside authorized roles and areas, reject invalid input, and enforce stale-write conflicts. Browser fixtures exercise the protected entry points. |
| 8.2 Least-privilege database and Storage | 1–6 | `cms-access.sql` and `cms-revisions.sql` assert private schema/function grants. `cms-content-types.sql` checks media grants, `cms-media.mjs` checks a direct Storage request, and `cms-scheduler.mjs` rejects unprivileged worker RPCs. |
| 8.3 Keep secret keys out of browser code and logs | 1, 3, 5, 7 | `cms-acceptance.mjs` scans the built browser assets and public responses for the disposable secret. The acceptance runner scans runtime app logs before printing them. |
| 8.4 Record actor and timestamp for important changes | 1–3, 5–6 | Access and content audit assertions include actor, operation and time. `cms-scheduler.mjs` checks attribution across handover and execution. Media metadata includes uploader and time. Settings use the content audit. |
| 8.5 Sign-in, upload and mutation rate limits | 1–3 | `cms-access.sql` closes the sign-in window after 30 starts. `cms-content-types.sql` rejects the ninth upload authorization. `cms-revisions.sql` rejects the 61st write. The runner retries scheduled work after an exhausted mutation budget. |
