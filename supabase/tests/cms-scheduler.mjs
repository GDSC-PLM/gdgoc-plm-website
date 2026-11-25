import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readdirSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

const base = "postgresql://postgres:postgres@127.0.0.1:54322/";
const db = "cms_schedule_" + randomUUID().replaceAll("-", "");
const flags = ["-X", "-qAt", "-v", "ON_ERROR_STOP=1"];
const sql = (query, database = db) => execFileSync("psql", [...flags, base + database], {
  input: query, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], timeout: 10000,
}).trim();
const [alice, bob, cara, contributor] = Array.from({ length: 4 }, () => randomUUID());
const claims = actor => `set local role authenticated;
  set local request.jwt.claims = '{"sub":"${actor}","app_metadata":{"provider":"google"},"amr":[{"method":"oauth"}]}';`;
const as = (actor, query) => sql("begin; " + claims(actor) + query + "; commit;");
const wall = "2099-07-10T10:30";
const tick = "select cms_private.run_due_job('2099-07-10T02:30Z')";
const change = (job, action, email = "") => `select public.cms_manage_job('${job}','${action}','${email}')`;
const manage = (action, email, full = false) => `select public.cms_manage_access('${action}','${email}',${full},'${full ? "{}" : "{events}"}')`;
const create = () => as(bob, `select public.cms_create_content('faq','Schedule test','q-${randomUUID()}','{"answer":"First"}')`);
const draft = id => sql(`select draft_revision_id from cms_private.content where id='${id}'`);
const live = id => sql(`select published_revision_id from cms_private.content where id='${id}'`);
const jobState = id => sql(`select status from cms_private.jobs where id='${id}'`);
const makeJob = (id, actor = alice, action = "publish") => {
  const target = action === "publish" ? draft(id) : live(id);
  const previous = live(id);
  return as(actor, `select public.cms_schedule('${id}','${action}','${target}',${previous ? "'" + previous + "'" : "null"},'${wall}','Asia/Manila')`);
};
const countExecutions = job => Number(sql(`select count(*) from cms_private.content_audit where operation_id='${job}'`));

// Hold the first transaction at commit and observe that the other session actually waits.
async function race(first, second) {
  const writers = [];
  function session(name) {
    const p = spawn("psql", [...flags, base + db], { env: { ...process.env, PGAPPNAME: name } });
    let output = "";
    let errors = "";
    p.stdout.on("data", chunk => { output += chunk; });
    p.stderr.on("data", chunk => { errors += chunk; });
    const done = new Promise((resolve, reject) => {
      p.once("error", reject);
      p.once("close", code => resolve({ code, output, errors }));
    });
    writers.push({ p, done });
    return { p, done, output: () => output };
  }
  async function until(check) {
    const end = Date.now() + 6000;
    while (!check()) {
      assert(Date.now() < end, "Concurrent transactions missed the lock barrier");
      await delay(30);
    }
  }
  try {
    const one = session(db + "_first");
    one.p.stdin.write("begin; " + first + ";\n\\echo LOCK_HELD\n");
    await until(() => one.output().includes("LOCK_HELD"));
    const two = session(db + "_second");
    two.p.stdin.end("begin; " + second + "; commit;\n");
    await until(() => sql(`select count(*) from pg_stat_activity where application_name='${db}_second' and wait_event_type='Lock'`) === "1");
    one.p.stdin.end("commit;\n");
    const a = await one.done;
    assert.equal(a.code, 0, a.errors);
    return await two.done;
  } finally {
    for (const { p } of writers) if (p.exitCode === null) p.kill();
    await Promise.allSettled(writers.map(writer => writer.done));
  }
}

sql("create database " + db + " template template0", "postgres");
try {
  // Only the Supabase interfaces referenced by the CMS migrations are needed here.
  sql(`create schema auth;
    create function auth.jwt() returns jsonb stable language sql as $$select nullif(current_setting('request.jwt.claims',true),'')::jsonb$$;
    create function auth.uid() returns uuid stable language sql as $$select (auth.jwt()->>'sub')::uuid$$;
    create schema storage;
    create table storage.buckets(id text,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(bucket_id text,name text,metadata jsonb);`);
  const migrations = readdirSync("supabase/migrations").filter(name => name.includes("_add_cms_")).sort();
  execFileSync("psql", [...flags, base + db, ...migrations.flatMap(file => ["-f", "supabase/migrations/" + file])]);
  for (const [id, name] of [[alice, "alice"], [bob, "bob"], [cara, "cara"], [contributor, "editor"]]) {
    const admin = id !== contributor;
    sql(`insert into cms_private.access values ('${name}@example.invalid',${admin},'${admin ? "{}" : "{events}"}',now(),'${id}',now(),null)`);
  }
  const instant = (wall, zone) => sql(`set time zone 'UTC'; select cms_private.schedule_instant('${wall}','${zone}')`);
  assert.equal(instant(wall, "Asia/Manila"), "2099-07-10 02:30:00+00");
  assert.throws(() => instant("2027-03-14T02:30", "America/New_York"), /does not exist/);
  assert.throws(() => instant("2027-11-07T01:30", "America/New_York"), /occurs twice/);
  assert.throws(() => instant("2027-04-04T01:45", "Australia/Lord_Howe"), /occurs twice/);
  assert.throws(() => instant("2027-02-30T10:30", "UTC"), /valid calendar/);
  assert.throws(() => instant(wall, "Made/Up"), /IANA time zone/);
  assert.equal(instant("2027-11-07T05:30", "UTC"), "2027-11-07 05:30:00+00");
  assert.equal(instant("2027-11-07T06:30", "UTC"), "2027-11-07 06:30:00+00");

  const unfinished = as(bob, "select public.cms_create_content('faq','Missing answer','unfinished','{}')");
  assert.throws(() => makeJob(unfinished), /Publication requires this field/);
  // Seed stale approval metadata directly in the disposable database to exercise the execution-time check.
  const orphan = makeJob(create());
  sql(`update cms_private.jobs set assignee='${contributor}', last_approver='${contributor}' where id='${orphan}'`);
  assert.equal(JSON.parse(sql(tick)).status, "unassigned");
  assert.equal(countExecutions(orphan), 0);

  const id = create();
  const original = draft(id);
  const job = makeJob(id);
  const next = as(bob, `select public.cms_write_draft('${id}','${original}','New draft','next-draft','{"answer":"Later"}')`);
  assert.throws(() => makeJob(id, contributor), /administrator access/);
  assert.equal(as(contributor, "select count(*) from public.cms_list_jobs(false)"), "0");
  assert.throws(() => as(bob, "select public.cms_run_due_job()"), /permission denied/);
  assert.throws(() => as(bob, "select public.cms_pending_refresh()"), /permission denied/);
  assert.throws(() => as(bob, "select public.cms_ack_refresh('{}')"), /permission denied/);
  assert.throws(() => sql("set role anon; select * from public.cms_list_jobs(false)"), /permission denied/);
  assert.throws(() => as(bob, "select * from cms_private.jobs"), /permission denied/);
  assert.throws(() => as(bob, `select public.cms_schedule('${id}','publish','${original}',null,'${wall}','UTC')`), /current unpublished draft/);
  assert.throws(() => as(bob, `select public.cms_schedule('${id}','publish','${next}',null,'2000-01-01T00:00','UTC')`), /in the future/);
  assert.equal(sql("select cms_private.run_due_job('2099-07-10T02:29:59Z')"), "");

  // Even an error after apply_publication must roll back both the pointer and the audit.
  sql(`create function reject_execution() returns trigger language plpgsql as $$begin raise exception 'fixture write failure'; end;$$;
    create trigger fail_after_publication before update on cms_private.jobs for each row when (new.status='executed') execute function reject_execution()`);
  assert.throws(() => sql(tick), /fixture write failure/);
  assert.equal(live(id), "");
  assert.equal(countExecutions(job), 0);
  assert.equal(jobState(job), "ready");
  sql("drop trigger fail_after_publication on cms_private.jobs");
  const runner = await race(tick, tick);
  assert.equal(runner.code, 0, runner.errors);
  assert.equal(runner.output.trim(), "");
  assert.equal(live(id), original);
  assert.equal(draft(id), next);
  assert.equal(countExecutions(job), 1);
  assert.equal(sql(tick), "");
  assert.equal(sql("select unnest(public.cms_pending_refresh())"), job);
  sql(`select public.cms_ack_refresh(array['${job}'::uuid]); select public.cms_ack_refresh(array['${job}'::uuid])`);
  assert.equal(sql("select unnest(public.cms_pending_refresh())"), "");

  // Removing and republishing the exact same revision still invalidates the unpublish target.
  const removal = makeJob(id, bob, "unpublish");
  as(bob, `select public.cms_apply_publication(gen_random_uuid(),'${id}','unpublish',null,'${original}')`);
  sql(`select cms_private.apply_publication('${bob}',gen_random_uuid(),'${id}','publish','${original}',null,true)`);
  assert.equal(JSON.parse(sql(tick)).status, "blocked");
  assert.equal(jobState(removal), "blocked");
  assert.equal(live(id), original);
  assert.equal(countExecutions(removal), 0);

  const cancelled = makeJob(id, bob, "unpublish");
  assert.equal((await race(claims(bob) + change(cancelled, "cancel"), tick)).output.trim(), "");
  assert.equal(jobState(cancelled), "cancelled");
  assert.equal(live(id), original);
  const executed = makeJob(id, bob, "unpublish");
  const lateCancel = await race(tick, claims(bob) + change(executed, "cancel"));
  assert.match(lateCancel.errors, /no longer pending/);
  assert.equal(live(id), "");
  assert.equal(countExecutions(executed), 1);

  const handover = makeJob(id);
  const another = makeJob(create());
  const revocation = claims(bob) + manage("revoke", "alice@example.invalid");
  assert.equal((await race(revocation, tick)).output.trim(), "");
  assert.equal(jobState(handover), "unassigned");
  assert.equal(jobState(another), "unassigned");
  assert.throws(() => as(alice, change(handover, "cancel")), /administrator access/);
  assert.throws(() => as(bob, change(handover, "assign", "editor@example.invalid")), /active full administrator/);
  as(bob, change(handover, "assign", "cara@example.invalid"));
  assert.equal(jobState(handover), "awaiting_approval");
  assert.throws(() => as(bob, change(handover, "approve")), /newly assigned/);
  assert.equal(sql(tick), "");
  as(cara, change(handover, "approve"));
  const lateDemote = await race(tick, claims(bob) + manage("update_permissions", "cara@example.invalid"));
  assert.equal(lateDemote.code, 0, lateDemote.errors);
  assert.equal(jobState(handover), "executed");
  assert.equal(jobState(another), "unassigned");
  assert.equal(live(id), next);
  assert.equal(sql(`select actor_id from cms_private.content_audit where operation_id='${handover}'`), cara);
  assert.equal(sql(`select string_agg(action || ':' || actor_id,',' order by id) from cms_private.audit
    where details->>'job'='${handover}' and occurred_at is not null`),
    [`schedule_approved:${alice}`, `schedule_unassigned:${bob}`, `schedule_reassigned:${bob}`, `schedule_reapproved:${cara}`].join(","));
  assert.equal(sql(`select count(*) from cms_private.audit where action='revoke' and actor_id='${bob}' and occurred_at is not null`), "1");

  as(bob, manage("update_permissions", "cara@example.invalid", true));
  const demoted = makeJob(create(), cara);
  as(bob, manage("update_permissions", "cara@example.invalid"));
  assert.equal(jobState(demoted), "unassigned");
  as(bob, manage("update_permissions", "cara@example.invalid", true));
  assert.throws(() => as(bob, change(demoted, "assign", "cara@example.invalid")), /another active/);
  as(bob, change(demoted, "assign", "bob@example.invalid"));
  as(bob, change(demoted, "approve"));
  sql(`update cms_private.mutation_rate set window_start=date_trunc('minute',clock_timestamp()) + interval '2 minutes',mutations=60 where actor_id='${bob}'`);
  assert.equal(JSON.parse(sql(tick)).status, "retry");
  assert.equal(countExecutions(demoted), 0);
  assert.equal(sql(tick), "");
  sql(`delete from cms_private.mutation_rate where actor_id='${bob}'`);
  assert.equal(JSON.parse(sql("select cms_private.run_due_job('2099-07-10T02:31Z')")).status, "executed");
  assert.equal(countExecutions(demoted), 1);
  console.log("Passed zoned time, pinning, rollback, access handover, concurrent execution/cancel/revoke, retries and execution audit checks.");
} finally {
  sql("drop database " + db, "postgres");
}
