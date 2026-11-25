import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createServer } from "node:net";
import { randomBytes } from "node:crypto";
import { constants, copyFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const source = process.cwd();
const project = "gdgoc-cms-acceptance-" + randomBytes(5).toString("hex");
const scratch = mkdtempSync(join(tmpdir(), project + "-"));
const appPort = 3417;
const apiPort = 55421;
const dbPort = 55422;
const app = "http://127.0.0.1:" + appPort;
const api = "http://127.0.0.1:" + apiPort;
const db = "postgresql://postgres:postgres@127.0.0.1:" + dbPort + "/postgres";
const env = {
  ...process.env,
  DO_NOT_TRACK: "1", SUPABASE_TELEMETRY_DISABLED: "1", NEXT_TELEMETRY_DISABLED: "1",
  SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID: "", SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET: "",
  CMS_SUPABASE_URL: "", CMS_SUPABASE_PUBLISHABLE_KEY: "", CMS_SUPABASE_SECRET_KEY: "",
  SUPABASE_URL: "", SUPABASE_SECRET_KEY: "", VERCEL_ENV: "",
  CMS_TEST_APP_PORT: String(appPort), CMS_TEST_DB_PORT: String(dbPort), CMS_SCHEDULER_APP_PORT: String(appPort),
  NEXT_FONT_GOOGLE_MOCKED_RESPONSES: join(scratch, "supabase/tests/local-fonts.cjs"),
};
const appProcesses = new Set();
const appLogs = new Map();
let stackStarting = false;
let interrupted = false;
for (const event of ["SIGINT", "SIGTERM"]) process.on(event, () => {
  interrupted = true;
  for (const processHandle of appProcesses) processHandle.kill();
});

function command(file, args, cwd = scratch, output = "inherit") {
  if (interrupted) throw new Error("Acceptance interrupted.");
  try {
    return execFileSync(file, args, { cwd, env, stdio: ["ignore", output, "inherit"], encoding: "utf8" });
  } catch (error) {
    throw new Error(file + " " + args.join(" ") + " failed (" + (error.code ?? error.status) + ").");
  }
}

async function unused(port) {
  const socket = createServer();
  await new Promise((resolve, reject) => {
    socket.once("error", reject);
    socket.listen(port, "127.0.0.1", () => socket.close(resolve));
  });
}

function prepare() {
  const tracked = command("git", ["ls-files", "-z"], source, "pipe").split("\0").filter(Boolean);
  for (const file of tracked) {
    mkdirSync(dirname(join(scratch, file)), { recursive: true });
    copyFileSync(join(source, file), join(scratch, file));
  }
  cpSync(join(source, "node_modules"), join(scratch, "node_modules"),
    { recursive: true, verbatimSymlinks: true, mode: constants.COPYFILE_FICLONE });
  const config = join(scratch, "supabase/config.toml");
  let toml = readFileSync(config, "utf8").replace(/project_id = ".*"/, 'project_id = "' + project + '"')
    .replace(/^(port|shadow_port) = 543(\d\d)$/gm, "$1 = 554$2")
    .replace(/^inspector_port = 8083$/m, "inspector_port = 9083");
  const toggle = (section, property, enabled) => {
    const start = toml.indexOf("\n[" + section + "]\n");
    assert(start >= 0, "Missing config section " + section);
    const next = toml.indexOf("\n[", start + 1);
    const end = next < 0 ? toml.length : next;
    const pattern = new RegExp("^" + property + " = (true|false)$", "m");
    const existing = toml.slice(start, end);
    assert.match(existing, pattern);
    toml = toml.slice(0, start) + existing.replace(pattern, property + " = " + enabled) + toml.slice(end);
  };
  toggle("auth", "enable_signup", false);
  toggle("auth.email", "enable_signup", true);
  toggle("auth.external.google", "enabled", false);
  toggle("auth.hook.before_user_created", "enabled", false);
  for (const service of ["studio", "analytics", "edge_runtime", "local_smtp"]) toggle(service, "enabled", false);
  writeFileSync(config, toml);
}

async function startApp(runtime) {
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(appPort)],
    { cwd: scratch, env: { ...env, ...runtime }, stdio: ["ignore", "pipe", "pipe"] });
  appProcesses.add(server);
  appLogs.set(server, "");
  for (const stream of [server.stdout, server.stderr]) stream.setEncoding("utf8").on("data", chunk => {
    appLogs.set(server, appLogs.get(server) + chunk);
  });
  server.once("close", () => appProcesses.delete(server));
  for (let attempt = 0; attempt < 80; attempt++) {
    if (interrupted || server.exitCode !== null) break;
    try {
      const response = await fetch(app + "/robots.txt", { signal: AbortSignal.timeout(1000) });
      if (response.ok) return server;
    } catch {
      await delay(250);
    }
  }
  throw new Error("The isolated production app failed to start.");
}

async function stopApp(server) {
  if (!appProcesses.has(server)) return;
  const done = new Promise(resolve => server.once("close", resolve));
  server.kill();
  await done;
  const secret = env.CMS_SUPABASE_SECRET_KEY;
  const log = appLogs.get(server) ?? "";
  assert(!secret || !log.includes(secret), "A disposable key appeared in production server logs.");
  appLogs.delete(server);
  process.stdout.write(log);
}

try {
  await Promise.all([appPort, apiPort, dbPort, 3399].map(unused));
  prepare();
  for (const args of [["lint"], ["exec", "next", "typegen"], ["exec", "tsc", "--noEmit"], ["build"]]) {
    console.log("\n> pnpm " + args.join(" "));
    command("pnpm", args);
  }

  console.log("\n> Start clean isolated Supabase");
  stackStarting = true;
  command("supabase", ["start"], scratch, "pipe");
  const keys = JSON.parse(command("supabase", ["status", "-o", "json"], scratch, "pipe"));
  assert.equal(keys.API_URL, api);
  assert.equal(keys.DB_URL, db);
  const publishable = keys.PUBLISHABLE_KEY ?? keys.ANON_KEY;
  const secret = keys.SECRET_KEY ?? keys.SERVICE_ROLE_KEY;
  assert(publishable && secret, "The disposable stack did not return API keys.");
  const sql = statement => command("psql", ["-XqAt", "-v", "ON_ERROR_STOP=1", db, "-c", statement], scratch, "pipe").trim();
  assert.equal(sql("select count(*) from cms_private.content"), "0");
  assert.equal(sql("select count(*) from cms_private.access"), "0");
  assert.equal(sql("select count(*) from supabase_migrations.schema_migrations"), String(
    command("git", ["ls-files", "supabase/migrations"], source, "pipe").trim().split("\n").length,
  ));
  console.log("Clean content and access tables verified. Every tracked migration applied.");

  for (const name of ["cms-access", "cms-revisions", "cms-content-types"]) {
    console.log("\n> " + name + ".sql");
    command("psql", ["-Xq", "-v", "ON_ERROR_STOP=1", db, "-f", "supabase/tests/" + name + ".sql"], scratch, "pipe");
  }
  Object.assign(env, { CMS_SUPABASE_URL: api, CMS_SUPABASE_PUBLISHABLE_KEY: publishable, CMS_SUPABASE_SECRET_KEY: secret });
  const server = await startApp({ SUPABASE_URL: api, SUPABASE_SECRET_KEY: secret });
  for (const [name, ...args] of [
    ["cms-revisions-concurrency"], ["cms-local-signin", "--verify"], ["cms-media"], ["cms-editor"],
    ["cms-scheduler"], ["cms-schedule-ui"], ["cms-public"], ["cms-acceptance", "configured"],
  ]) {
    console.log("\n> " + name + ".mjs");
    command(process.execPath, ["supabase/tests/" + name + ".mjs", ...args]);
  }
  assert.equal(sql("select count(*) from cms_private.access"), "0");
  assert.equal(sql("select count(*) from cms_private.content where archived_at is null"), "0");
  await stopApp(server);

  const fallback = await startApp({ CMS_SUPABASE_URL: "" });
  command(process.execPath, ["supabase/tests/cms-acceptance.mjs", "unavailable"]);
  await stopApp(fallback);
  console.log("\nCMS local acceptance passed, including the runtime key scan.");
} finally {
  try {
    for (const server of appProcesses) await stopApp(server);
  } finally {
    if (stackStarting) {
      execFileSync("supabase", ["stop", "--no-backup"], { cwd: scratch, env, stdio: ["ignore", "ignore", "inherit"] });
      console.log("Disposed the isolated Supabase project.");
    }
    rmSync(scratch, { recursive: true, force: true });
  }
}
