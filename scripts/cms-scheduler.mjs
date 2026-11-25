import { createHmac } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { loopbackHttp } from "../src/lib/local-http.mjs";

const api = process.env.CMS_SUPABASE_URL;
const secret = process.env.CMS_SUPABASE_SECRET_KEY;
const port = Number(process.env.CMS_SCHEDULER_APP_PORT ?? 3000);
if (!loopbackHttp(api) || !secret || !Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("Check the local CMS Supabase configuration and application port.");
}
const args = process.argv.slice(2);
const once = args.length === 1 && args[0] === "--once";
if (args.length && !once) throw new Error("Use cms:scheduler with no arguments or --once.");

async function rpc(name, args = {}) {
  const response = await fetch(api + "/rest/v1/rpc/" + name, {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(15000),
    headers: { apikey: secret, "Content-Type": "application/json" }, body: JSON.stringify(args),
  });
  if (!response.ok) throw new Error(name + " returned HTTP " + response.status);
  const body = await response.text();
  return body ? JSON.parse(body) : null;
}

async function cacheGeneration(method) {
  const token = createHmac("sha256", secret).update("cms-local-cache-refresh-v1").digest("hex");
  const response = await fetch("http://127.0.0.1:" + port + "/api/cms/scheduler/refresh", {
    method, headers: { Authorization: "Bearer " + token }, redirect: "error", signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Cache refresh returned HTTP " + response.status);
  const { generation } = await response.json();
  if (typeof generation !== "string" || !generation) throw new Error("Invalid cache generation.");
  return generation;
}

async function flushCache() {
  const jobs = await rpc("cms_pending_refresh");
  if (!jobs.length) return;
  const before = await cacheGeneration("POST");
  if (await cacheGeneration("GET") === before) throw new Error("Cache refresh is still pending.");
  await rpc("cms_ack_refresh", { p_jobs: jobs });
  console.log("Refreshed the publication cache for", jobs.length, "job(s).");
}

do {
  let failed = false;
  try {
    for (let index = 0; index < 25; index++) {
      const job = await rpc("cms_run_due_job");
      if (!job) break;
      console.log(job.id, job.status);
    }
  } catch (error) {
    console.error("Queue execution:", error.message);
    failed = true;
  }
  try {
    await flushCache();
  } catch (error) {
    console.error("Cache refresh pending:", error.message);
    failed = true;
  }
  if (once) {
    process.exitCode = failed ? 1 : 0;
    break;
  }
  await delay(5000);
} while (true);
