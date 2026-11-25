import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { app, api } from "./local.mjs";

const mode = process.argv[2];
const request = (path, options) => fetch(app + path, {
  redirect: "manual", signal: AbortSignal.timeout(15_000), ...options,
});

if (mode === "unavailable") {
  for (const path of ["/events", "/events/missing"]) {
    const response = await request(path, { headers: { "user-agent": "Googlebot" } });
    const html = await response.text();
    assert.match(html, /Content temporarily unavailable/);
    assert.match(html, /<meta name="robots" content="noindex/);
  }
  const home = await request("/");
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Stellar is cooking/);
  assert.equal((await request("/api/hype")).status, 503);
  console.log("Missing backend renders content unavailable and noindex while the baseline homepage stays usable.");
} else if (mode === "configured") {
  const secret = process.env.CMS_SUPABASE_SECRET_KEY;
  assert(secret);
  const sensitive = [secret, process.env.SUPABASE_SECRET_KEY].filter(Boolean);
  const clean = text => {
    for (const key of sensitive) assert(!text.includes(key), "A server key appeared in a browser response or asset.");
  };
  for (const path of ["/", "/about", "/contact", "/events", "/blogs", "/projects", "/partners", "/team",
    "/faq", "/haribots", "/zines", "/games", "/robots.txt", "/sitemap.xml", "/manifest.webmanifest",
    "/favicon.ico", "/apple-icon.png", "/opengraph-image.png", "/admin/login"]) {
    const response = await request(path, { headers: { "user-agent": "Googlebot" } });
    assert.equal(response.status, 200, path);
    if (response.headers.get("content-type")?.match(/text|json|xml/)) clean(await response.text());
  }
  const empty = await request("/events", { headers: { "user-agent": "Googlebot" } });
  const html = await empty.text();
  assert.match(html, /No entries have been published here yet/);
  assert.match(html, /<meta name="robots" content="noindex/);
  assert.equal((await request("/not-a-real-route")).status, 404);
  assert.match((await request("/admin")).headers.get("location") ?? "", /\/admin\/login/);
  assert.equal((await request("/signup")).status, 404);
  const denied = await fetch(api + "/auth/v1/signup", {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(5000),
    headers: { apikey: process.env.CMS_SUPABASE_PUBLISHABLE_KEY, "content-type": "application/json" },
    body: JSON.stringify({ email: "unapproved-" + randomUUID() + "@example.invalid", password: randomUUID() }),
  });
  assert.equal(denied.status, 422);
  const denial = await denied.json();
  const reason = denial.error_code ?? denial.code;
  assert(reason === "signup_disabled" ||
    reason === 422 && /signups? (?:are )?(?:disabled|not allowed)/i.test(denial.msg ?? denial.message ?? ""));
  const callback = await request("/admin/auth/callback");
  assert.equal(callback.status, 307);
  assert.match(callback.headers.get("location") ?? "", /\/admin\/login/);

  const staticRoot = ".next/static";
  let assets = 0;
  for (const name of readdirSync(staticRoot, { recursive: true, encoding: "utf8" })) {
    if (!/\.(?:js|css|map)$/.test(name)) continue;
    clean(readFileSync(join(staticRoot, name), "utf8"));
    assets++;
  }
  assert(assets > 0);

  const streamId = randomUUID();
  const path = "/api/hype?streamId=" + streamId;
  const first = await request(path);
  assert.equal(first.status, 200);
  assert.match(first.headers.get("cache-control") ?? "", /no-store/);
  const cookie = first.headers.get("set-cookie")?.split(";")[0];
  assert(cookie?.startsWith("hype-browser="));
  const before = await first.json();
  assert.equal(before.acknowledgedThrough, 0);
  const tap = (origin = app, fetchSite = "same-origin") => request("/api/hype", {
    method: "POST", headers: { origin, "sec-fetch-site": fetchSite, "content-type": "application/json", cookie },
    body: JSON.stringify({ streamId, through: 1 }),
  });
  assert.equal((await tap("http://127.0.0.1:1")).status, 403);
  assert.equal((await tap(app, "same-site")).status, 403);
  const saved = await tap();
  const result = await saved.json();
  assert.equal(saved.status, 200, result.error);
  assert.deepEqual(result, { count: before.count + 1, acknowledgedThrough: 1 });
  const replay = await tap();
  assert.equal(replay.status, 200);
  assert.deepEqual(await replay.json(), { count: before.count + 1, acknowledgedThrough: 1 });
  const final = await request(path);
  assert.deepEqual(await final.json(), { count: before.count + 1, acknowledgedThrough: 1 });
  console.log("Baseline routes, public signup denial, empty/indexing states, browser key scan (" + assets + " assets), and a deduplicated real local spark passed.");
} else {
  throw new Error("Select the configured or unavailable acceptance probe.");
}
