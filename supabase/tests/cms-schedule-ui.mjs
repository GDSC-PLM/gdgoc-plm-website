import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { accept, checked, cleanupAuthFixtures, fixture } from "./cms-local-signin.mjs";

const port = Number(process.env.CMS_TEST_APP_PORT ?? 3000);
assert(Number.isInteger(port) && port > 0 && port < 65536);
const origin = "http://127.0.0.1:" + port;
const title = "Scheduler fixture " + randomUUID();
const sql = query => execFileSync("psql", ["-XqAt", "-v", "ON_ERROR_STOP=1",
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres", "-c", query], { encoding: "utf8" }).trim();
const rpc = async (account, method, args) => checked(await account.client.rpc(method, args), method);
const run = appPort => spawnSync(process.execPath, [resolve("scripts/cms-scheduler.mjs"), "--once"], {
  encoding: "utf8", timeout: 30000, env: { ...process.env, CMS_SCHEDULER_APP_PORT: String(appPort) },
});
const browser = await chromium.launch({ executablePath: process.env.CMS_TEST_CHROMIUM ?? "/usr/bin/google-chrome",
  args: ["--no-sandbox"] });
async function pageFor(account, width) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: "block" });
  await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  if (account) await context.addCookies(account.getCookies().map(({ name, value }) => ({
    name, value, domain: "127.0.0.1", path: "/admin", httpOnly: true, sameSite: "Lax",
  })));
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  return page;
}
let replacement;
let content;
try {
  const owner = await fixture("admin");
  replacement = await fixture("admin");
  await accept(owner, true);
  await accept(replacement, true);
  const editor = await fixture("contributor");
  await rpc(owner, "cms_manage_access", { operation: "invite", target: editor.email, grant_areas: ["events"] });
  await accept(editor, true);
  const mobile = await pageFor(replacement, 393);
  const desktop = await pageFor(owner, 1280);
  const guest = await pageFor(null, 393);
  assert.equal((await guest.goto(origin + "/admin/schedule")).url(), origin + "/admin/login");
  const restricted = await pageFor(editor, 393);
  assert.equal((await restricted.goto(origin + "/admin/schedule")).status(), 404);
  assert.equal((await fetch(origin + "/api/cms/scheduler/refresh", { method: "POST" })).status, 403);
  content = await rpc(owner, "cms_create_content", { p_area: "faq", p_title: title, p_slug: "schedule-" + randomUUID(), p_fields: { answer: "Approved answer" } });
  const record = async () => (await rpc(replacement, "cms_get_content", { p_content_id: content }))[0];
  const revision = (await record()).draft_revision_id;
  const open = async page => {
    await page.goto(origin + "/admin/content/faq/" + content);
    await page.getByRole("link", { name: "Schedule publication", exact: true }).click();
  };
  await open(desktop);
  await desktop.getByLabel("Local date and time").fill("2099-11-01T01:30");
  await desktop.getByLabel("Time zone", { exact: true }).fill("America/New_York");
  await desktop.getByRole("button", { name: "Approve and schedule" }).click();
  await desktop.getByRole("alert").filter({ hasText: "occurs twice" }).waitFor();
  assert.equal(await desktop.getByLabel("Local date and time").inputValue(), "2099-11-01T01:30");
  await desktop.getByLabel("Local date and time").fill("2099-07-10T10:30");
  await desktop.getByLabel("Time zone", { exact: true }).fill("Asia/Manila");
  await desktop.getByRole("button", { name: "Approve and schedule" }).click();
  await desktop.getByRole("status").filter({ hasText: "Publication scheduled." }).waitFor();
  const jobRow = page => page.getByRole("listitem").filter({ hasText: title });
  await jobRow(desktop).getByText("Scheduled", { exact: true }).waitFor();
  const jobs = await rpc(owner, "cms_list_jobs", { p_closed: false });
  const job = jobs.find(job => job.content_id === content).id;
  await rpc(owner, "cms_write_draft", { p_content_id: content, p_expected_draft_id: revision, p_title: title + " newer",
    p_slug: "schedule-" + randomUUID(), p_fields: { answer: "Unapproved answer" } });
  await rpc(replacement, "cms_manage_access", { operation: "revoke", target: owner.email });
  await desktop.reload();
  assert(desktop.url().includes("/admin/login"));
  await mobile.goto(origin + "/admin/schedule");
  await jobRow(mobile).getByText("Paused · unassigned").waitFor();
  await jobRow(mobile).getByLabel("Replacement administrator").selectOption(replacement.email);
  await jobRow(mobile).getByRole("button", { name: "Assign administrator" }).click();
  await jobRow(mobile).getByText("Paused · awaiting approval").waitFor();
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const preview = jobRow(mobile).getByRole("link", { name: "Review revision 1" });
  await preview.click();
  await mobile.getByText("Approved answer", { exact: true }).waitFor();
  await mobile.goBack();
  await jobRow(mobile).getByRole("button", { name: "Approve revision 1" }).click();
  await jobRow(mobile).getByText("Scheduled", { exact: true }).waitFor();

  // Use only our fixture for this tick. Preserve other local officers' queued work.
  assert.equal(sql(`select count(*) from cms_private.jobs where id <> '${job}'
    and ((status='ready' and due_at <= now() + interval '2 minutes') or (status='executed' and refreshed_at is null))`), "0",
    "Use an isolated local stack for the runner check while other work is due.");
  sql(`update cms_private.jobs set due_at=clock_timestamp()-interval '1 second' where id='${job}' and content_id='${content}'`);
  const offline = run(1);
  assert.equal(offline.status, 1, offline.stderr);
  assert.match(offline.stdout, /executed/);
  assert.match(offline.stderr, /Cache refresh pending/);
  assert.equal((await record()).published_revision_id, revision);
  assert.equal(sql(`select refreshed_at is null from cms_private.jobs where id='${job}'`), "t");
  const online = run(port);
  assert.equal(online.status, 0, online.stderr);
  assert.match(online.stdout, /Refreshed the publication cache/);
  const replay = run(port);
  assert.equal(replay.status, 0, replay.stderr);
  assert.equal(replay.stdout.trim(), "");
  assert.equal(sql(`select count(*) from cms_private.content_audit where operation_id='${job}'`), "1");

  await open(mobile);
  await mobile.getByRole("combobox", { name: "Action", exact: true }).selectOption("unpublish");
  await mobile.getByLabel("Local date and time").fill("2099-08-10T10:30");
  await mobile.getByRole("button", { name: "Approve and schedule" }).click();
  await mobile.getByRole("status").filter({ hasText: "Scheduled to unpublish." }).waitFor();
  await jobRow(mobile).getByRole("button", { name: "Cancel job" }).click();
  await mobile.getByRole("status").filter({ hasText: "Job cancelled." }).waitFor();
  await jobRow(mobile).getByText("Cancelled", { exact: true }).waitFor();
  await jobRow(mobile).getByText("Executed", { exact: true }).waitFor();
  console.log("Passed local desktop/mobile scheduling, revocation, reapproval, cancellation and cache recovery after a failed refresh.");
} finally {
  try {
    if (content && replacement) {
      const [item] = await rpc(replacement, "cms_get_content", { p_content_id: content });
      await rpc(replacement, "cms_apply_publication", { p_content_id: content, p_operation_id: randomUUID(),
        p_action: "archive", p_revision_id: item.draft_revision_id, p_expected_published_id: item.published_revision_id });
    }
  } finally {
    await browser.close();
    cleanupAuthFixtures();
  }
}
