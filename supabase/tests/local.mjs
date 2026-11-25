import { loopbackHttp } from "../../src/lib/local-http.mjs";

function localPort(value) {
  if (!/^[1-9]\d{0,4}$/.test(value) || Number(value) > 65535) throw new Error("Use a valid loopback port.");
  return value;
}

export const api = process.env.CMS_SUPABASE_URL ?? "http://127.0.0.1:54321";
if (!loopbackHttp(api)) throw new Error("The fixtures require a loopback Supabase API.");

export const db = "postgresql://postgres:postgres@127.0.0.1:" + localPort(process.env.CMS_TEST_DB_PORT ?? "54322") + "/";
export const app = "http://127.0.0.1:" + localPort(process.env.CMS_TEST_APP_PORT ?? "3000");
