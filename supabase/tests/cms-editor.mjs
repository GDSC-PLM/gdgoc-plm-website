import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { chromium } from "playwright-core";
import sharp from "sharp";
import { accept, checked, cleanupAuthFixtures, fixture } from "./cms-local-signin.mjs";
import { api } from "./local.mjs";

const port = Number(process.env.CMS_TEST_APP_PORT ?? 3000);
assert(Number.isInteger(port) && port >= 1024 && port < 65536);
const origin = "http://127.0.0.1:" + port;
const listPath = "/admin/content/events";
const name = "Editor fixture " + randomUUID().slice(0, 8);
const slug = "editor-fixture-" + randomUUID();
const browser = await chromium.launch({
  executablePath: process.env.CMS_TEST_CHROMIUM ?? "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox"],
});

let admin;
let id;
const rpc = async (client, name, args) => checked(await client.rpc(name, args), name);
const record = async () => (await rpc(admin.client, "cms_get_content", { p_content_id: id }))[0];

async function contextFor(account, mobile = false) {
  const context = await browser.newContext({
    viewport: mobile ? { width: 393, height: 852 } : { width: 1280, height: 900 },
    isMobile: mobile, hasTouch: mobile, serviceWorkers: "block",
  });
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return url.hostname === "127.0.0.1" ? route.continue() : route.abort();
  });
  if (account) await context.addCookies(account.getCookies().map(({ name, value }) => ({
    name, value, domain: "127.0.0.1", path: "/admin", httpOnly: true, sameSite: "Lax",
  })));
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  return page;
}

async function confirm(page, label) {
  await page.getByRole("button", { name: label, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: label === "Restore revision 1" ? "Restore revision" : label });
  await dialog.getByRole("button", { name: /Confirm / }).click();
}

async function projection() {
  const response = await fetch(api + "/rest/v1/rpc/cms_read_published", {
    method: "POST",
    headers: { apikey: process.env.CMS_SUPABASE_PUBLISHABLE_KEY, "content-type": "application/json" },
    body: JSON.stringify({ p_content_id: id }), signal: AbortSignal.timeout(5000),
  });
  assert.equal(response.status, 200);
  return response.json();
}

try {
  admin = await fixture("admin");
  await accept(admin, true);
  const contributor = await fixture("contributor");
  await rpc(admin.client, "cms_manage_access", { operation: "invite", target: contributor.email, grant_areas: ["events"] });
  await accept(contributor, true);
  const mobile = await contextFor(contributor, true);
  await mobile.goto(origin + "/admin", { waitUntil: "networkidle" });
  await mobile.getByRole("link", { name: "Events", exact: true }).waitFor();
  assert.equal(await mobile.getByRole("link", { name: /Manage administrator access|Blogs/ }).count(), 0);
  assert.equal((await mobile.goto(origin + "/admin/content/blogs"))?.status(), 404);
  assert.equal((await mobile.goto(origin + "/admin/access"))?.status(), 404);
  await mobile.goto(origin + listPath);
  await mobile.getByRole("link", { name: "New draft" }).click();
  await mobile.getByRole("heading", { name: "New draft" }).waitFor();
  await mobile.keyboard.press("Tab");
  assert.equal(await mobile.evaluate(() => document.activeElement?.textContent?.trim()), "Dashboard");
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const title = mobile.getByLabel("Title", { exact: true });
  await title.fill(name);
  await mobile.getByLabel("Slug", { exact: true }).fill("Invalid Slug");
  await mobile.getByRole("button", { name: "Save draft" }).click();
  await mobile.getByText("Use up to 100 lowercase letters, numbers and single hyphens.").waitFor();
  assert.equal(await mobile.getByLabel("Slug", { exact: true }).getAttribute("aria-invalid"), "true");
  await mobile.getByLabel("Slug", { exact: true }).fill(slug);

  let warned = false;
  mobile.once("dialog", async (dialog) => { warned = dialog.type() === "confirm"; await dialog.dismiss(); });
  await mobile.getByRole("link", { name: "Dashboard" }).click();
  assert(warned);
  assert(mobile.url().endsWith("/new"));
  await mobile.getByRole("button", { name: "Save draft" }).click();
  await mobile.getByRole("status").filter({ hasText: "Draft saved." }).waitFor();
  const editorPath = new URL(mobile.url()).pathname;
  id = editorPath.split("/").at(-1);
  assert(id && id !== "new");

  await title.click();
  await title.fill(name + " unsaved");
  mobile.once("dialog", (dialog) => dialog.accept());
  await mobile.reload({ waitUntil: "networkidle" });
  await mobile.getByRole("button", { name: "Recover unsaved edits" }).click();
  assert.equal(await title.inputValue(), name + " unsaved");
  await title.fill(name);

  await mobile.getByLabel("Starts at").fill("2026-12-11T18:30+08:00");
  await mobile.getByLabel("Mode").selectOption("online");
  const description = mobile.getByLabel("Description", { exact: true });
  await description.fill("Editor note");
  await description.selectText();
  await mobile.getByRole("button", { name: "Bold" }).click();
  assert.equal(await description.inputValue(), "**Editor note**");
  await description.fill("**Editor note**\n\n[Unsupported URL](javascript:void(0))\n\n<span data-fixture-raw>Plain text</span>\n\n![Forbidden embed](https://example.invalid/image.png)");
  await mobile.locator("details").filter({ has: mobile.locator("#editor-cover-file") }).locator("summary").click();
  const image = await sharp({ create: { width: 24, height: 16, channels: 3, background: "#b6a1dc" } }).png().toBuffer();
  await mobile.locator("#editor-cover-file").setInputFiles({ name: "editor-fixture.png", mimeType: "image/png", buffer: image });
  const mediaResponse = mobile.waitForResponse((response) =>
    response.url().includes("/admin/media?area=events") && response.request().method() === "POST");
  await mobile.getByRole("button", { name: "Upload as new" }).click();
  const uploaded = await mediaResponse;
  const uploadMessage = uploaded.headers()["content-type"]?.includes("application/json") && !uploaded.ok()
    ? (await uploaded.json()).error : "";
  assert.equal(uploaded.status(), 201, uploadMessage + " (origin " + await uploaded.request().headerValue("origin") + ")");
  const version = (await uploaded.json()).version_id;
  const publicFile = origin + "/api/cms/media/" + version;
  const publicPage = origin + "/events/" + slug;
  const checkPublic = url => fetch(url, { headers: { "user-agent": "Googlebot" }, redirect: "manual", signal: AbortSignal.timeout(10000) });
  assert.equal((await checkPublic(publicFile)).status, 404);
  await mobile.getByText("File uploaded and selected. Save the draft to keep this selection.").waitFor();
  await mobile.getByLabel("Cover alt text").fill("Lavender fixture image");
  await mobile.getByRole("button", { name: "Save draft" }).click();
  await mobile.getByText("Revision 2", { exact: false }).first().waitFor();
  assert.equal(await mobile.getByRole("button", { name: "Publish", exact: true }).count(), 0);

  const preview = editorPath + "/preview";
  const previewResponse = await mobile.goto(origin + preview, { waitUntil: "networkidle" });
  assert.match(previewResponse?.headers()["cache-control"] ?? "", /no-store/);
  assert.match(previewResponse?.headers()["x-robots-tag"] ?? "", /noindex/);
  await mobile.getByText("Private preview").waitFor();
  await mobile.locator("article strong").filter({ hasText: "Editor note" }).waitFor();
  assert.equal(await mobile.locator("[data-fixture-raw], article iframe, article a[href^='javascript:']").count(), 0);
  assert.equal(await mobile.locator("article img").count(), 1);
  assert.equal(await mobile.getByAltText("Lavender fixture image").count(), 1);
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  if (process.env.CMS_TEST_CAPTURE === "1") await mobile.screenshot({ path: "/tmp/gdgoc-cms-preview-mobile.png" });
  assert.deepEqual(await projection(), []);
  assert.equal((await checkPublic(publicPage)).status, 404);
  const anonymous = await contextFor(null);
  await anonymous.goto(origin + preview);
  assert.match(anonymous.url(), /\/admin\/login/);
  assert.equal(await anonymous.getByText(name).count(), 0);

  const desktop = await contextFor(admin);
  await desktop.goto(origin + editorPath, { waitUntil: "networkidle" });
  if (process.env.CMS_TEST_CAPTURE === "1") await desktop.screenshot({ path: "/tmp/gdgoc-cms-editor-desktop.png" });
  await desktop.getByRole("button", { name: "Publish", exact: true }).click();
  assert.equal(await desktop.evaluate(() => document.activeElement?.textContent?.trim()), "Cancel");
  await desktop.keyboard.press("Escape");
  assert.equal(await desktop.getByRole("dialog").count(), 0);
  assert.deepEqual(await projection(), []);
  await confirm(desktop, "Publish");
  await desktop.getByText("Enter an approved Google Forms or Luma HTTPS link.").waitFor();
  assert.equal(await desktop.getByLabel("Registration URL").getAttribute("aria-invalid"), "true");
  await desktop.getByLabel("Registration URL").fill("https://lu.ma/editor-fixture");
  await desktop.getByRole("button", { name: "Save draft" }).click();
  await desktop.getByText("Revision 3", { exact: false }).first().waitFor();
  await confirm(desktop, "Publish");
  await desktop.getByText("Published. This is the current published revision.").waitFor();
  const live = (await record()).published_revision_id;
  assert.equal((await projection())[0]?.title, name);
  await anonymous.goto(publicPage);
  await anonymous.getByRole("heading", { name, exact: true }).waitFor();
  await anonymous.getByAltText("Lavender fixture image").waitFor();
  assert.equal((await checkPublic(publicFile)).status, 200);

  await confirm(desktop, "Restore revision 1");
  await desktop.getByText("Revision restored as a new draft. The published version is unchanged.").waitFor();
  assert.equal((await record()).published_revision_id, live);
  assert.equal((await projection())[0]?.title, name);
  assert.match(await (await checkPublic(publicPage)).text(), /Lavender fixture image/);
  await desktop.getByRole("button", { name: "Unpublish", exact: true }).click();
  await desktop.getByRole("dialog", { name: "Unpublish" }).getByRole("button", { name: "Cancel" }).click();
  assert.equal((await record()).published_revision_id, live);
  await confirm(desktop, "Unpublish");
  await desktop.getByText("Unpublished. The saved draft is still available.").waitFor();
  assert.deepEqual(await projection(), []);
  assert.equal((await checkPublic(publicPage)).status, 404);
  assert.equal((await checkPublic(publicFile)).status, 404);
  await confirm(desktop, "Archive");
  await desktop.getByText("Archived. Revision history is retained.").waitFor();
  assert.equal(await desktop.getByRole("button", { name: "Save draft" }).count(), 0);
  await desktop.getByRole("link", { name: "Preview revision 1" }).waitFor();
  assert.equal((await checkPublic(publicPage)).status, 404);
  await desktop.goto(origin + "/admin");
  await desktop.getByRole("button", { name: "Sign out", exact: true }).click();
  await desktop.waitForURL("**/admin/login");
  await desktop.goto(origin + preview);
  assert.match(desktop.url(), /\/admin\/login/);

  console.log("Passed scoped contributor editing through live rendering, media, preview, restore, unpublish/archive, and officer sign-out with keyboard and mobile checks.");
} finally {
  await browser.close();
  try {
    if (admin && id) {
      const current = await record();
      if (current && !current.archived_at) {
        await rpc(admin.client, "cms_apply_publication", {
          p_operation_id: randomUUID(), p_content_id: id, p_action: "archive",
          p_revision_id: current.draft_revision_id, p_expected_published_id: current.published_revision_id,
        });
      }
    }
  } finally {
    cleanupAuthFixtures();
  }
}
