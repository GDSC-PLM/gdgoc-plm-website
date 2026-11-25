import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PDFDocument, PDFName } from "pdf-lib";
import sharp from "sharp";
import { accept, checked, cleanupAuthFixtures, fixture } from "./cms-local-signin.mjs";
import { api } from "./local.mjs";

const port = Number(process.env.CMS_TEST_APP_PORT ?? "3000");
assert(Number.isInteger(port) && port >= 1024 && port < 65536);
const site = "http://127.0.0.1:" + port;
const items = [];
const run = randomUUID();
let admin;

function rpc(account, name, args) {
  return account.client.rpc(name, args).then((result) => checked(result, name));
}

function app(path, account, init) {
  const headers = new Headers(init?.headers);
  if (account) headers.set("cookie", account.getCookies().map(({ name, value }) => name + "=" + value).join("; "));
  return fetch(site + path, {
    ...init, headers, redirect: "manual", signal: AbortSignal.timeout(20_000),
  });
}

function upload(account, area, mime, data, mediaId) {
  const query = new URLSearchParams({ area, ...(mediaId ? { mediaId } : {}) });
  return app("/admin/media?" + query, account, {
    method: "POST", body: data,
    headers: { origin: site, "content-type": mime, "x-file-name": "test-fixture" },
  });
}

function privateFile(version, account) {
  return app("/admin/media/" + version.version_id, account);
}

function publicFile(version) {
  return app("/api/cms/media/" + version.version_id);
}

async function state(item) {
  const [record] = await rpc(admin, "cms_get_content", { p_content_id: item });
  assert(record);
  return record;
}

async function create(area, slug, fields) {
  const item = await rpc(admin, "cms_create_content", { p_area: area, p_title: "CMS media fixture", p_slug: slug, p_fields: fields });
  items.push(item);
  return state(item);
}

async function publish(record, action = "publish") {
  return rpc(admin, "cms_apply_publication", {
    p_operation_id: randomUUID(), p_content_id: record.id, p_action: action,
    p_revision_id: action === "unpublish" ? null : record.draft_revision_id,
    p_expected_published_id: record.published_revision_id,
  });
}

async function bytes(response, mime) {
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), mime);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  return Buffer.from(await response.arrayBuffer());
}

function sampleImage(background) {
  return sharp({ create: { width: 12, height: 8, channels: 3, background } }).png().toBuffer();
}

async function samplePdf(active = false) {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  if (active) pdf.catalog.set(PDFName.of("OpenAction"), pdf.context.obj({ S: PDFName.of("JavaScript") }));
  return Buffer.from(await pdf.save());
}

function eventFields(cover, alt) {
  return {
    description: "A fixture used to verify published media.",
    startsAt: "2026-12-11T08:00Z",
    mode: "online",
    registrationUrl: "https://lu.ma/local-fixture",
    cover: { versionId: cover.version_id, alt },
  };
}

async function verify() {
  admin = await fixture("admin");
  await accept(admin, true);
  const contributor = await fixture("contributor");
  await rpc(admin, "cms_manage_access", { operation: "invite", target: contributor.email, grant_areas: ["events"] });
  await accept(contributor, true);

  const image = await sampleImage("red");
  assert.equal((await upload(contributor, "blogs", "image/png", image)).status, 404);
  assert.equal((await upload(admin, "events", "image/svg+xml", "<svg/>")).status, 415);
  assert.equal((await upload(admin, "events", "image/jpeg", image)).status, 422);
  assert.equal((await upload(admin, "events", "image/png", Buffer.alloc(5 * 1024 * 1024 + 1))).status, 413);
  assert.equal((await upload(admin, "zines", "application/pdf", "%PDF-1.7\ninvalid\n%%EOF")).status, 422);
  assert.equal((await upload(admin, "zines", "application/pdf", await samplePdf(true))).status, 422);

  const started = await upload(contributor, "events", "image/png", image);
  assert.equal(started.status, 201, "valid PNG accepted");
  const old = await started.json();
  assert.equal(old.width, 12);
  assert.equal(old.height, 8);
  assert.equal((await privateFile(old)).status, 307);
  assert.equal((await publicFile(old)).status, 404);
  const original = await bytes(await privateFile(old, contributor), "image/png");

  const first = await create("events", "media-first-" + run, eventFields(old, "Red event art"));
  await publish(first);
  assert.deepEqual(await bytes(await publicFile(old), "image/png"), original);
  const direct = await fetch(api + "/storage/v1/object/authenticated/cms-media/" + old.version_id, {
    headers: { apikey: process.env.CMS_SUPABASE_PUBLISHABLE_KEY }, signal: AbortSignal.timeout(5000),
  });
  assert.equal(direct.ok, false, "direct anonymous Storage access stays blocked while published");

  const replacement = await upload(contributor, "events", "image/png", await sampleImage("green"), old.media_id);
  assert.equal(replacement.status, 201);
  const next = await replacement.json();
  assert.equal(next.media_id, old.media_id);
  assert.notEqual(next.version_id, old.version_id);
  const choices = await rpc(contributor, "cms_list_media", { p_area: "events" });
  assert.equal(choices.find((choice) => choice.media_id === old.media_id)?.version_id, next.version_id);
  const updated = await rpc(contributor, "cms_write_draft", {
    p_content_id: first.id, p_expected_draft_id: first.draft_revision_id,
    p_title: "Replacement fixture", p_slug: "media-renamed-" + run, p_fields: eventFields(next, "Green event art"),
  });
  assert.equal((await state(first.id)).draft_revision_id, updated);
  assert.deepEqual(await bytes(await publicFile(old), "image/png"), original);
  assert.equal((await publicFile(next)).status, 404);

  const reused = await create("events", "media-reused-" + run, eventFields(old, "Red illustration reused in a second event"));
  await publish(reused);
  await publish(await state(first.id));
  assert.equal((await state(first.id)).id, first.id);
  assert.deepEqual(await bytes(await publicFile(old), "image/png"), original);
  await publish(await state(reused.id), "archive");
  assert.equal((await publicFile(old)).status, 404);
  assert.notDeepEqual(await bytes(await publicFile(next), "image/png"), original);
  assert.deepEqual(await bytes(await privateFile(old, contributor), "image/png"), original);

  const restored = await rpc(contributor, "cms_write_draft", {
    p_content_id: first.id, p_expected_draft_id: updated, p_source_revision_id: first.draft_revision_id,
  });
  const [snapshot] = await rpc(contributor, "cms_get_revision", { p_content_id: first.id, p_revision_id: restored });
  assert.deepEqual(snapshot.fields.cover, { versionId: old.version_id, alt: "Red event art" });
  assert.equal((await state(first.id)).published_revision_id, updated);
  assert.equal((await publicFile(old)).status, 404);

  const pdf = await samplePdf();
  const pdfUpload = await upload(admin, "zines", "application/pdf", pdf);
  assert.equal(pdfUpload.status, 201);
  const zine = await pdfUpload.json();
  assert.equal((await privateFile(zine, contributor)).status, 404);
  assert.equal((await publicFile(zine)).status, 404);
  const issue = await create("zines", "media-zine-" + run, {
    issueLabel: "Fixture issue", releaseDate: "2026-12-12", description: "PDF test",
    download: { versionId: zine.version_id },
  });
  await publish(issue);
  const delivery = await publicFile(zine);
  assert.match(delivery.headers.get("content-disposition"), /^attachment/);
  assert.deepEqual(await bytes(delivery, "application/pdf"), pdf);
  await publish(await state(issue.id), "unpublish");
  assert.equal((await publicFile(zine)).status, 404);

  console.log("Passed local file validation, Storage isolation, immutable replacement and reuse, restore, and PDF delivery.");
}

try {
  await verify();
} finally {
  try {
    for (const item of items) {
      const record = await state(item);
      if (!record.archived_at) await publish(record, "archive");
    }
  } finally {
    cleanupAuthFixtures();
  }
}
