import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { chromium } from "playwright-core";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { accept, checked, cleanupAuthFixtures, fixture } from "./cms-local-signin.mjs";
import { api, db } from "./local.mjs";

const port = Number(process.env.CMS_TEST_APP_PORT ?? 3000);
assert(Number.isInteger(port) && port >= 1024 && port < 65536);
const site = "http://127.0.0.1:" + port;
const unique = "public-" + randomUUID();
const created = [];
const sql = query => execFileSync("psql", ["-XqAt", "-v", "ON_ERROR_STOP=1",
  db + "postgres", "-c", query], { encoding: "utf8" }).trim();
let admin;
let cleanupOfficer;

const rpc = async (method, args, account = admin) => checked(await account.client.rpc(method, args), method);
async function anonRpc(method, args) {
  const response = await fetch(api + "/rest/v1/rpc/" + method, {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(5000),
    headers: { apikey: process.env.CMS_SUPABASE_PUBLISHABLE_KEY, "content-type": "application/json" },
    body: JSON.stringify(args),
  });
  assert.equal(response.status, 200);
  return response.json();
}
const state = async id => (await rpc("cms_get_content", { p_content_id: id }))[0];
const get = (path, init) => fetch(site + path, {
  headers: { "user-agent": "Googlebot" }, redirect: "manual", signal: AbortSignal.timeout(15_000), ...init,
});

async function create(area, title, suffix, fields) {
  const id = await rpc("cms_create_content", { p_area: area, p_title: title, p_slug: unique + suffix, p_fields: fields });
  created.push(id);
  return state(id);
}

async function save(item, title, suffix, fields) {
  return rpc("cms_write_draft", {
    p_content_id: item.id, p_expected_draft_id: item.draft_revision_id, p_title: title,
    p_slug: unique + suffix, p_fields: fields,
  });
}

async function publish(item, action = "publish", account = admin) {
  await rpc("cms_apply_publication", {
    p_content_id: item.id, p_operation_id: randomUUID(), p_action: action,
    p_revision_id: action === "unpublish" ? null : item.draft_revision_id,
    p_expected_published_id: item.published_revision_id,
  }, account);
}

async function file(area, mime, data, existing) {
  const query = new URLSearchParams({ area, ...(existing ? { mediaId: existing } : {}) });
  const response = await get("/admin/media?" + query, {
    method: "POST", body: data,
    headers: { origin: site, "content-type": mime, "x-file-name": "fixture",
      cookie: admin.getCookies().map(({ name, value }) => name + "=" + value).join("; ") },
  });
  assert.equal(response.status, 201, response.ok ? "" : await response.text());
  return response.json();
}
const image = background => sharp({ create: { width: 16, height: 10, channels: 3, background } }).png().toBuffer();
const asset = version => "/api/cms/media/" + version.version_id;

const browser = await chromium.launch({ executablePath: process.env.CMS_TEST_CHROMIUM ?? "/usr/bin/google-chrome",
  args: ["--no-sandbox"] });
async function browserPage(account, width) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: "block", reducedMotion: "reduce" });
  if (account) await context.addCookies(account.getCookies().map(({ name, value }) => ({
    name, value, domain: "127.0.0.1", path: "/admin", sameSite: "Lax", httpOnly: true,
  })));
  await context.route("**/*", route => new URL(route.request().url()).origin === site ? route.continue() : route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  return page;
}

try {
  assert.equal(sql("select count(*) from cms_private.content where area='settings' and archived_at is null"), "0",
    "Run the public fixture on a local stack without an active settings record.");
  assert.equal(sql("select count(*) from cms_private.jobs where status='ready' and due_at <= now()+interval '2 minutes' or status='executed' and refreshed_at is null"), "0",
    "Stop the polling worker and use a fixture stack without due jobs or pending cache refreshes.");
  const mobile = await browserPage(null, 393);
  let confirmed = 4;
  let writes = 0;
  await mobile.route("**/api/hype**", async route => {
    if (route.request().method() === "POST") {
      const { through } = route.request().postDataJSON();
      assert.equal(through, 1);
      confirmed++;
      writes++;
    }
    await route.fulfill({ json: { count: confirmed, acknowledgedThrough: writes ? 1 : 0 } });
  });
  await mobile.goto(site);
  await mobile.getByRole("heading", { name: /Something.*Stellar is cooking/ }).waitFor();
  await mobile.locator("[data-count-incoming]").filter({ hasText: /^4$/ }).waitFor();
  await Promise.all([
    mobile.waitForResponse(response => response.url().endsWith("/api/hype") && response.request().method() === "POST"),
    mobile.getByRole("button", { name: "Add a spark" }).click(),
  ]);
  assert.equal(writes, 1);
  await mobile.locator("[data-count-incoming]").filter({ hasText: /^5$/ }).waitFor();

  admin = await fixture("admin");
  await accept(admin, true);
  cleanupOfficer = await fixture("admin");
  await accept(cleanupOfficer, true);
  const officer = await browserPage(admin, 1280);
  const contributor = await fixture("contributor");
  await rpc("cms_manage_access", { operation: "invite", target: contributor.email, grant_areas: ["events"] });
  await accept(contributor, true);
  const editor = await browserPage(contributor, 393);
  assert.equal((await editor.goto(site + "/admin/content/settings"))?.status(), 404);

  const cover = await file("events", "image/png", await image("#5a399a"));
  const replacement = await file("events", "image/png", await image("#86b174"), cover.media_id);
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const download = await file("zines", "application/pdf", Buffer.from(await pdf.save()));
  const eventFields = {
    description: "Approved event details.", startsAt: "2099-01-01T11:00Z", mode: "online",
    registrationUrl: "https://lu.ma/local-fixture", cover: { versionId: cover.version_id, alt: "Purple event cover" },
    featured: true, sortOrder: 0, metaTitle: "Local event SEO", metaDescription: "Local event sharing description.",
  };
  const event = await create("events", "Approved event", "-event", eventFields);
  assert.deepEqual(await anonRpc("cms_public_article", { p_revision: event.draft_revision_id }), []);
  const all = [
    [event, "events", "-event", "Approved event"],
    [await create("blogs", "Approved project", "-project", { category: "project", body: "Project details." }), "projects", "-project", "Approved project"],
    [await create("blogs", "Approved recap", "-recap", { category: "past-event", body: "Recap details." }), "blogs", "-recap", "Approved recap"],
    [await create("blogs", "Approved initiative", "-initiative", { category: "initiative", body: "Initiative details." }), "blogs", "-initiative", "Approved initiative"],
    [await create("board", "Approved officer", "-officer", { role: "Lead", bio: "Officer bio." }), "team", "-officer", "Approved officer"],
    [await create("partners", "Approved sponsor", "-sponsor", { kind: "sponsor", description: "Sponsor details." }), "partners", "-sponsor", "Approved sponsor"],
    [await create("zines", "Approved zine", "-zine", { issueLabel: "Issue 1", releaseDate: "2026-10-01", description: "Zine details.",
      download: { versionId: download.version_id } }), "zines", "-zine", "Approved zine"],
    [await create("haribots", "Approved Haribot", "-haribot", { description: "Character details." }), "haribots", "-haribot", "Approved Haribot"],
    [await create("faq", "Approved question?", "-faq", { answer: "Approved answer." }), "faq", "-faq", "Approved question?"],
    [await create("games", "Approved game", "-game", { description: "Game overview.", instructions: "Follow the game instructions.",
      outboundUrl: "https://gd.games/example" }), "games", "-game", "Approved game"],
  ];

  for (const [item, collection, suffix, title] of all) {
    const path = "/" + collection + "/" + unique + suffix;
    const preview = "/admin/content/" + item.area + "/" + item.id + "/preview";
    assert.equal((await get(path)).status, 404);
    assert.match((await get(preview)).headers.get("location") ?? "", /\/admin\/login/);
    const response = await officer.goto(site + preview);
    assert.match(response.headers()["cache-control"], /no-store/);
    assert.equal(response.headers()["x-robots-tag"], "noindex, nofollow");
    await officer.getByText("Private preview", { exact: true }).waitFor();
    await officer.getByRole("heading", { name: title, exact: true }).waitFor();
    await publish(item);
    const live = await get(path);
    assert.equal(live.status, 200);
    assert.match(live.headers.get("cache-control") ?? "", /no-store/);
    assert((await live.text()).includes(title));
  }

  const oldPath = "/events/" + unique + "-event";
  const page = await get(oldPath);
  const html = await page.text();
  assert.match(html, /<title>Local event SEO \| GDGoC PLM<\/title>/);
  assert(html.includes("Local event sharing description."));
  assert(html.includes('rel="canonical" href="https://www.gdgocplm.org' + oldPath));
  assert(html.includes('property="og:image" content="https://www.gdgocplm.org' + asset(cover)));
  const cards = await anonRpc("cms_public_list", { p_collection: "events", p_filter: "upcoming" });
  const eventCard = cards.find(item => item.id === event.id);
  assert(eventCard);
  assert(!("fields" in eventCard || "saved_by" in eventCard || "revision_id" in eventCard));
  assert.match((await get(asset(download))).headers.get("content-disposition") ?? "", /attachment/);
  const originalBytes = Buffer.from(await (await get(asset(cover))).arrayBuffer());
  assert.equal((await get(asset(replacement))).status, 404);
  await save(await state(event.id), "Renamed public event", "-new", {
    ...eventFields, cover: { versionId: replacement.version_id, alt: "Green replacement cover" },
  });
  assert.deepEqual(Buffer.from(await (await get(asset(cover))).arrayBuffer()), originalBytes);
  assert.equal((await get("/events/" + unique + "-new")).status, 404);
  await officer.goto(site + "/admin/content/events/" + event.id);
  await officer.getByRole("button", { name: "Publish", exact: true }).click();
  await officer.getByRole("button", { name: "Confirm publish", exact: false }).click();
  await officer.getByRole("status").filter({ hasText: "Published." }).waitFor();
  const newPath = "/events/" + unique + "-new";
  const redirect = await get(oldPath);
  assert.equal(redirect.status, 308);
  assert.match(redirect.headers.get("cache-control") ?? "", /no-store/);
  assert.equal(new URL(redirect.headers.get("location"), site).pathname, newPath);
  assert.match(await (await get(newPath)).text(), /Renamed public event/);
  assert.equal((await get(asset(cover))).status, 404);
  assert.equal((await get(asset(replacement))).status, 200);
  assert.deepEqual(await anonRpc("cms_public_article", { p_revision: event.draft_revision_id }), []);

  for (let index = 0; index < 13; index++) {
    const item = await create("faq", "Page fixture " + index, "-page-" + index,
      { answer: "Page test.", featured: true, sortOrder: index });
    await publish(item);
  }
  await mobile.goto(site + "/faq");
  await mobile.keyboard.press("Tab");
  assert.equal(await mobile.evaluate(() => document.activeElement?.textContent), "Skip to content");
  assert(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.equal(await mobile.locator("main li").count(), 12);
  await mobile.getByRole("link", { name: "Next", exact: true }).click();
  await mobile.getByText("Page 2", { exact: true }).waitFor();
  assert.equal(await mobile.getByText("Page fixture 12", { exact: true }).count(), 1);
  const blogPage = await (await get("/blogs?filter=initiative")).text();
  assert(blogPage.includes("Approved initiative") && !blogPage.includes("Approved recap"));

  await officer.goto(site + "/admin/content/settings/new");
  await officer.getByLabel("Homepage headline, first line").fill("Preview-only headline");
  await officer.getByLabel("Navigation rows").fill("Calendar | /events | show\nStories | /blogs | hide\nThe Board | /team | show");
  await officer.getByLabel("Footer link rows").fill("Local questions | /faq");
  await officer.getByLabel("Social link rows").fill("instagram | https://www.instagram.com/gdg_plm\nfacebook | https://www.facebook.com/gdgplm");
  await officer.getByLabel("Contact email").fill("officers@example.invalid");
  await officer.getByRole("textbox", { name: "Contact information", exact: true }).fill("Fixture office hours.");
  await officer.getByLabel("Featured content IDs").fill(event.id);
  await officer.getByRole("button", { name: "Save draft" }).click();
  await officer.getByRole("status").filter({ hasText: "Draft saved." }).waitFor();
  const settingsId = new URL(officer.url()).pathname.split("/").at(-1);
  created.push(settingsId);
  assert(!(await (await get("/")).text()).includes("Preview-only headline"));
  const preview = officer.getByRole("link", { name: "Preview saved draft" });
  let privateCounterRequests = 0;
  officer.on("request", request => { if (new URL(request.url()).pathname === "/api/hype") privateCounterRequests++; });
  await preview.click();
  await officer.getByRole("heading", { name: /Preview-only headline/ }).waitFor();
  await officer.getByRole("link", { name: "Calendar", exact: true }).waitFor();
  await officer.getByText("Fixture office hours.", { exact: true }).waitFor();
  assert.equal(privateCounterRequests, 0);
  await officer.getByRole("link", { name: "Back to editor" }).click();
  await officer.getByRole("button", { name: "Publish", exact: true }).click();
  await officer.getByRole("button", { name: /Confirm publish/ }).click();
  await officer.getByRole("status").filter({ hasText: "Published." }).waitFor();

  const home = await (await get("/")).text();
  assert(home.includes("Preview-only headline") && home.includes("Local questions") && home.includes("Renamed public event"));
  assert(home.includes("officers@example.invalid"));
  assert(home.indexOf("Instagram") < home.indexOf("Facebook"));
  const navigation = await (await get("/events")).text();
  assert(navigation.includes("Calendar") && !navigation.includes(">Stories<"));
  assert(navigation.indexOf(">Calendar<") < navigation.indexOf(">The Board<"));
  assert.equal((await get("/blogs")).status, 200);
  assert((await (await get("/contact")).text()).includes("Fixture office hours."));
  const sitemap = await (await get("/sitemap.xml")).text();
  assert(sitemap.includes(newPath) && !sitemap.includes(oldPath + "</loc>") && !sitemap.includes("/admin"));

  await officer.getByLabel("Homepage headline, first line").fill("Second settings draft");
  await officer.getByLabel("Navigation rows").fill("The Board | /team | show\nAgenda | /events | show");
  await officer.getByRole("button", { name: "Save draft" }).click();
  await officer.getByRole("status").filter({ hasText: "Draft saved." }).waitFor();
  const settingsDraft = await state(settingsId);
  assert.notEqual(settingsDraft.draft_revision_id, settingsDraft.published_revision_id);
  const stillLive = await (await get("/")).text();
  assert(stillLive.includes(">Calendar<") && !stillLive.includes(">Agenda<"));
  assert(stillLive.includes("Preview-only headline") && !stillLive.includes("Second settings draft"));
  await officer.getByRole("link", { name: "Preview saved draft" }).click();
  await officer.getByRole("heading", { name: /Second settings draft/ }).waitFor();
  await officer.getByRole("link", { name: "Agenda", exact: true }).waitFor();

  const removalDate = "2099-07-10T10:30";
  const liveRevision = (await state(event.id)).published_revision_id;
  const job = await rpc("cms_schedule", { p_content_id: event.id, p_action: "unpublish", p_revision_id: liveRevision,
    p_expected_live: liveRevision, p_local: removalDate, p_zone: "Asia/Manila" });
  sql(`update cms_private.jobs set due_at=clock_timestamp()-interval '1 second' where id='${job}'`);
  execFileSync(process.execPath, ["scripts/cms-scheduler.mjs", "--once"], {
    env: { ...process.env, CMS_SCHEDULER_APP_PORT: String(port) }, timeout: 30000,
  });
  assert.equal((await get(newPath)).status, 404);
  assert.equal((await get(oldPath)).status, 404);
  assert.equal((await get(asset(replacement))).status, 404);
  assert(!(await (await get("/")).text()).includes("Renamed public event"));
  assert(!(await (await get("/sitemap.xml")).text()).includes(newPath));
  await publish(await state(all.at(-1)[0].id), "archive");
  assert.equal((await get("/games/" + unique + "-game")).status, 404);
  console.log("Passed baseline sparks, every public template and private preview, metadata, pagination, navigation, settings, media and scheduled cache refresh.");
} finally {
  try {
    for (const id of created.reverse()) {
      const item = await state(id);
      if (!item.archived_at) await publish(item, "archive", cleanupOfficer);
    }
  } finally {
    await browser.close();
    cleanupAuthFixtures();
  }
}
