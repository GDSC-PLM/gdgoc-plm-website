import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { createServerClient, serializeCookieHeader } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { api, app as site, db } from "./local.mjs";

const helper = "http://127.0.0.1:3399";
const key = process.env.CMS_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.CMS_SUPABASE_SECRET_KEY;
const mode = process.argv[2] ?? "admin";

if (process.env.CMS_SUPABASE_URL !== api || !key || !secret ||
    !["admin", "contributor", "--verify"].includes(mode)) {
  throw new Error("Use local CMS settings and select admin, contributor or --verify.");
}

const operator = createClient(api, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const accounts = [];

function sql(input) {
  execFileSync("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1", db + "postgres"], { input, stdio: ["pipe", "ignore", "inherit"] });
}

export function checked(result, step) {
  if (result.error) throw new Error(step + " failed (" + (result.error.code ?? result.error.message) + ").");
  return result.data;
}

export async function fixture(role) {
  const email = "cms-" + role + "-" + randomUUID() + "@example.invalid";
  const password = randomUUID() + randomUUID();
  const { user } = checked(await operator.auth.admin.createUser({
    email, password, email_confirm: true,
  }), "Create local Auth fixture");
  const id = user.id;
  assert.match(id, /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/);
  accounts.push({ id, email });

  const cookies = new Map();
  const client = createServerClient(api, key, {
    cookieOptions: { name: "gdgoc-cms-auth", path: "/admin", httpOnly: true, sameSite: "lax" },
    cookies: {
      getAll: () => [...cookies.values()],
      setAll: (values) => values.forEach((value) => {
        if (value.value) cookies.set(value.name, value);
        else cookies.delete(value.name);
      }),
    },
  });
  const { session } = checked(await client.auth.signInWithPassword({ email, password }), "Start local fixture session");
  assert(session);
  const claims = JSON.parse(Buffer.from(session.access_token.split(".")[1], "base64url"));
  assert.match(claims.session_id, /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/);

  // Only the trusted local database operator can annotate this synthetic session.
  sql(`
    begin;
    update auth.users set raw_app_meta_data = raw_app_meta_data ||
      '{"provider":"google","providers":["google"]}'::jsonb where id = '${id}';
    insert into auth.identities (user_id, provider, provider_id, identity_data, created_at, updated_at, last_sign_in_at)
      values ('${id}', 'google', '${id}', jsonb_build_object(
        'sub', '${id}', 'email', '${email}', 'email_verified', true), now(), now(), now());
    insert into auth.mfa_amr_claims (id, session_id, authentication_method, created_at, updated_at)
      values (gen_random_uuid(), '${claims.session_id}', 'oauth', now(), now());
    ${role === "admin" ? "select cms_private.invite_operator_admin('" + email + "');" : ""}
    commit;
  `);
  checked(await client.auth.refreshSession(), "Refresh the signed fixture session");
  return {
    client, email,
    getCookies: () => [...cookies.values()],
  };
}

export async function accept(account, expected) {
  assert.equal(checked(await account.client.rpc("cms_accept_invitation"), "Check fixture invitation"), expected);
}

async function page(account, path) {
  const cookie = account.getCookies().map(({ name, value }) => name + "=" + value).join("; ");
  return fetch(site + path, { redirect: "manual", headers: { cookie }, signal: AbortSignal.timeout(5_000) });
}

async function verify() {
  const admin = await fixture("admin");
  await accept(admin, true);
  const login = await fetch(await loginLink(admin), { redirect: "manual", signal: AbortSignal.timeout(5_000) });
  assert.equal(login.status, 303);
  assert.equal(login.headers.get("location"), site + "/admin");
  const sessionCookies = login.headers.getSetCookie();
  assert(sessionCookies.length > 0);
  assert(sessionCookies.every((cookie) => /; HttpOnly/i.test(cookie) && /; Path=\/admin/.test(cookie)));
  const access = await fetch(site + "/admin/access", {
    redirect: "manual",
    headers: { cookie: sessionCookies.map((cookie) => cookie.split(";")[0]).join("; ") },
    signal: AbortSignal.timeout(5_000),
  });
  assert.equal(access.status, 200);

  const contributor = await fixture("contributor");
  await accept(contributor, false);
  const denied = await page(contributor, "/admin");
  assert.equal(denied.status, 307);
  assert.match(denied.headers.get("location"), /status=denied/);

  checked(await admin.client.rpc("cms_manage_access", {
    operation: "invite", target: contributor.email, grant_areas: ["events"],
  }), "Invite scoped contributor");
  await accept(contributor, true);
  assert.equal((await page(contributor, "/admin")).status, 200);
  assert.equal((await page(contributor, "/admin/access")).status, 404);
  assert.equal(checked(await contributor.client.rpc("cms_can_edit", { area: "events" }), "Check edit scope"), true);
  assert.equal(checked(await contributor.client.rpc("cms_can_edit", { area: "blogs" }), "Check denied scope"), false);
  assert.equal(checked(await contributor.client.rpc("cms_can_publish"), "Check publish permission"), false);

  checked(await admin.client.rpc("cms_manage_access", {
    operation: "revoke", target: contributor.email,
  }), "Revoke contributor");
  const revoked = await page(contributor, "/admin");
  assert.equal(revoked.status, 307);
  assert.match(revoked.headers.get("location"), /status=denied/);
  console.log("Passed local HTTP and RPC checks for an unapproved identity, full admin, scoped contributor, and revocation with the same session.");
}

function loginLink(account) {
  const path = "/" + randomUUID();
  const server = createServer((request, response) => {
    if (request.method !== "GET" || request.url !== path || request.headers.host !== "127.0.0.1:3399") {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(303, {
      Location: site + "/admin",
      "Set-Cookie": account.getCookies().map(({ name, value, options }) => serializeCookieHeader(name, value, options)),
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    }).end();
    server.close();
  });

  const timeout = setTimeout(() => server.close(), 300_000);
  server.once("close", () => clearTimeout(timeout));
  return new Promise((resolve, reject) => {
    server.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    server.listen(3399, "127.0.0.1", () => resolve(helper + path));
  });
}

async function serve() {
  const admin = await fixture("admin");
  await accept(admin, true);
  let account = admin;
  if (mode === "contributor") {
    account = await fixture("contributor");
    checked(await admin.client.rpc("cms_manage_access", {
      operation: "invite", target: account.email, grant_areas: ["events"],
    }), "Invite demo contributor");
    await accept(account, true);
  }
  console.log("Open this one-time local sign-in link: " + await loginLink(account));
}

export function cleanupAuthFixtures() {
  for (const { id, email } of accounts.splice(0).reverse()) {
    sql(`begin;
      delete from cms_private.audit where target_email = '${email}';
      delete from cms_private.access where email = '${email}';
      delete from auth.refresh_tokens where user_id = '${id}';
      delete from auth.users where id = '${id}' and email = '${email}';
      commit;`);
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  if (mode === "--verify") {
    try {
      await verify();
    } finally {
      cleanupAuthFixtures();
    }
  } else {
    await serve();
  }
}
