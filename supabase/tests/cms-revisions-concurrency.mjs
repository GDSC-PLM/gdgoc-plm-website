import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

const host = "postgresql://postgres:postgres@127.0.0.1:54322/";
const scratch = "cms_concurrency_" + randomBytes(8).toString("hex");
const actor = "21000000-0000-4000-8000-000000000002";
const login = `
  set local role authenticated;
  set local request.jwt.claims =
    '{"sub":"${actor}","app_metadata":{"provider":"google"},"amr":[{"method":"oauth"}]}';
`;
const options = ["-X", "-qAt", "-v", "ON_ERROR_STOP=1"];

function run(database, args) {
  return execFileSync("psql", [...options, host + database, ...args], {
    encoding: "utf8",
    timeout: 10_000,
  }).trim();
}

function writer(label) {
  const connection = spawn("psql", [...options, host + scratch], {
    env: { ...process.env, PGAPPNAME: label },
    stdio: ["pipe", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  connection.stdout.setEncoding("utf8").on("data", (text) => { stdout += text; });
  connection.stderr.setEncoding("utf8").on("data", (text) => { stderr += text; });
  const done = new Promise((resolve, reject) => {
    connection.once("error", reject);
    connection.once("close", (code) => resolve({ code, stdout, stderr }));
  });
  return { connection, instruction: connection.stdin, stdout: () => stdout, done };
}

async function waitFor(check, reason) {
  const deadline = Date.now() + 5000;
  while (!check()) {
    if (Date.now() >= deadline) throw new Error(reason);
    await delay(50);
  }
}

run("postgres", ["-c", "create database " + scratch + " template template0"]);
let first;
let second;
try {
  // A separate database needs only the Supabase claim functions used by these migrations.
  run(scratch, ["-c", `
    create schema auth;
    create function auth.jwt() returns jsonb stable language sql
      as $$ select nullif(current_setting('request.jwt.claims', true), '')::jsonb $$;
    create function auth.uid() returns uuid stable language sql
      as $$ select (auth.jwt() ->> 'sub')::uuid $$;
  `, "-f", "supabase/migrations/20261125100000_add_cms_access.sql",
    "-f", "supabase/migrations/20261125110000_add_cms_revisions_and_publication.sql"]);
  const contentId = run(scratch, ["-c", `
    begin;
    insert into cms_private.access (email, full_admin, areas, expires_at, user_id, accepted_at)
      values ('cms-race@example.invalid', false, '{events}', now(), '${actor}', now());
    ${login}
    select public.cms_create_content('events', 'Original', 'same-item', '{}');
    commit;
  `]);
  const draftId = run(scratch, ["-c", "select draft_revision_id from cms_private.content"]);
  const save = (title) => `
    select public.cms_write_draft('${contentId}', '${draftId}', '${title}', 'same-item', '{}');
  `;

  first = writer("cms_first_writer");
  first.instruction.write(`begin; ${login} ${save("First writer")}\n\\echo ROW_LOCK_HELD\n`);
  await waitFor(() => first.stdout().includes("ROW_LOCK_HELD"), "First writer did not reach the commit barrier.");

  second = writer("cms_second_writer");
  second.instruction.end(`\\set VERBOSITY verbose\nbegin; ${login} ${save("Second writer")} commit;\n`);
  await waitFor(() => run(scratch, ["-c", `
    select count(*) from pg_stat_activity
    where application_name = 'cms_second_writer' and wait_event_type = 'Lock';
  `]) === "1", "Second writer did not wait on the locked draft.");

  first.instruction.end("commit;\n");
  const results = await Promise.all([first.done, second.done]);
  assert.equal(results[0].code, 0, results[0].stderr);
  assert.equal(results[1].code, 3, results[1].stderr);
  assert.match(results[1].stderr, /PT409/);
  assert.equal(run(scratch, ["-c", `
    select r.title || ':' || (select count(*) from cms_private.revisions)
    from cms_private.content c join cms_private.revisions r on r.id = c.draft_revision_id;
  `]), "First writer:2");
  console.log("Concurrent writes reached the same draft lock. The first saved and the second returned PT409.");
} finally {
  const openWriters = [first, second].filter(Boolean);
  for (const { connection } of openWriters) {
    if (connection.exitCode === null) connection.kill();
  }
  await Promise.allSettled(openWriters.map(({ done }) => done));
  run("postgres", ["-c", "drop database " + scratch]);
}
