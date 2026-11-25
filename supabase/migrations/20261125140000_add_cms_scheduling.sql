
-- Queue changes share the access-management transaction lock. Content writes retain
-- their normal row locks, so manual publications also serialize with due work.
create table cms_private.jobs (
  seq bigint generated always as identity unique,
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null,
  action public.cms_publication_action not null check (action in ('publish', 'unpublish')),
  revision_id uuid not null,
  expected_live uuid,
  last_publication bigint references cms_private.content_audit(id),
  due_at timestamptz not null,
  zone text not null,
  local_minute timestamp not null,
  status text not null check (status in ('ready','unassigned','awaiting_approval','cancelled','executed','blocked')),
  assignee uuid,
  last_approver uuid not null,
  reason text,
  retry_at timestamptz,
  refreshed_at timestamptz,
  foreign key (content_id, revision_id) references cms_private.revisions(content_id, id),
  foreign key (content_id, expected_live) references cms_private.revisions(content_id, id),
  check (status <> 'ready' or (assignee is not null and assignee = last_approver)),
  check (status <> 'unassigned' or assignee is null),
  check (status <> 'awaiting_approval' or (assignee is not null and assignee <> last_approver)),
  check (refreshed_at is null or status = 'executed')
);
create index cms_jobs_due on cms_private.jobs(due_at, seq) where status = 'ready';
create index cms_jobs_assignee on cms_private.jobs(assignee) where status in ('ready','awaiting_approval');
create index cms_jobs_refresh on cms_private.jobs(seq) where status = 'executed' and refreshed_at is null;
alter table cms_private.jobs enable row level security;
revoke all on cms_private.jobs from public, anon, authenticated, service_role;

create function cms_private.schedule_instant(p_local text, p_zone text)
returns timestamptz language plpgsql stable set search_path = ''
as $$
declare
  wall_time timestamp;
  matches integer;
  instant timestamptz;
begin
  if p_local is null or p_local !~ '^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$' then
    raise exception 'Enter a calendar date and time to the minute.' using errcode = '22023';
  end if;
  wall_time := p_local::timestamp;
  if p_zone is null or not (p_zone = 'UTC' or p_zone ~ '^[A-Z][A-Za-z]+/[A-Za-z0-9_+/-]+$')
    or not exists (select from pg_timezone_names where name = p_zone) then
    raise exception 'Enter an IANA time zone such as Asia/Manila or UTC.' using errcode = '22023';
  end if;
  -- All present/future IANA offsets are whole minutes within this range.
  select count(*), min(candidate) into matches, instant
    from generate_series((wall_time at time zone 'UTC') - interval '15 hours',
                         (wall_time at time zone 'UTC') + interval '15 hours', interval '1 minute') candidate
    where candidate at time zone p_zone = wall_time;
  if matches = 0 then
    raise exception 'This local time does not exist. Choose another time.' using errcode = '22023';
  elsif matches > 1 then
    raise exception 'This local time occurs twice. Enter the intended instant in UTC.' using errcode = '22023';
  end if;
  return instant;
exception when datetime_field_overflow or invalid_datetime_format then
  raise exception 'Enter a valid calendar date and time.' using errcode = '22023';
end;
$$;

create function cms_private.schedule_admin()
returns uuid language plpgsql set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(190581, 1);
  if not public.cms_can_publish() then
    raise exception 'Full administrator access required.' using errcode = '42501';
  end if;
  return auth.uid();
end;
$$;

create function cms_private.latest_publication(p_content_id uuid)
returns bigint language sql stable set search_path = ''
as $$
  select id from cms_private.content_audit
  where content_id = p_content_id and operation_id is not null order by id desc limit 1;
$$;

create function public.cms_schedule(p_content_id uuid, p_action public.cms_publication_action,
  p_revision_id uuid, p_expected_live uuid, p_local text, p_zone text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := cms_private.schedule_admin();
  item cms_private.content%rowtype;
  revision cms_private.revisions%rowtype;
  due timestamptz := cms_private.schedule_instant(p_local, p_zone);
  job uuid;
begin
  if due <= clock_timestamp() then
    raise exception 'Choose a time in the future.' using errcode = '22023';
  end if;
  select * into item from cms_private.content where id = p_content_id for update;
  if not found or item.archived_at is not null or item.published_revision_id is distinct from p_expected_live then
    raise exception 'The live content changed. Reload before scheduling.' using errcode = 'PT409';
  end if;
  if p_action = 'publish' then
    if p_revision_id is distinct from item.draft_revision_id or p_revision_id = p_expected_live then
      raise exception 'Review the current unpublished draft before scheduling.' using errcode = 'PT409';
    end if;
    select * into strict revision from cms_private.revisions where id = p_revision_id;
    perform cms_private.validate_publish_revision(revision);
  elsif p_action = 'unpublish' then
    if p_revision_id is null or p_revision_id is distinct from p_expected_live then
      raise exception 'Review the current live revision before scheduling removal.' using errcode = 'PT409';
    end if;
  else
    raise exception 'Choose publish or unpublish.' using errcode = '22023';
  end if;
  perform cms_private.consume_mutation(actor);
  insert into cms_private.jobs(content_id, action, revision_id, expected_live, last_publication,
    due_at, zone, local_minute, status, assignee, last_approver)
    values (item.id, p_action, p_revision_id, p_expected_live, cms_private.latest_publication(item.id),
      due, p_zone, p_local::timestamp, 'ready', actor, actor) returning id into job;
  insert into cms_private.audit(actor_id, action, target_email, details)
    select actor, 'schedule_approved', email, jsonb_build_object('job',job,'revision',p_revision_id,'due_at',due)
    from cms_private.access where user_id = actor;
  return job;
end;
$$;

create function cms_private.unassign_schedules()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if old.user_id is not null and old.full_admin and old.revoked_at is null and
    (tg_op = 'DELETE' or new.revoked_at is not null or not new.full_admin or new.user_id is distinct from old.user_id) then
    with paused as (
      update cms_private.jobs set status = 'unassigned', assignee = null, retry_at = null, reason = null
        where assignee = old.user_id and status in ('ready','awaiting_approval') returning id
    )
    insert into cms_private.audit(actor_id, operator_name, action, target_email, details)
      select auth.uid(), case when auth.uid() is null then session_user end, 'schedule_unassigned', old.email,
        jsonb_build_object('job',id,'previous_assignee',old.user_id) from paused;
  end if;
  return null;
end;
$$;
create trigger cms_unassign_schedules after update or delete on cms_private.access
for each row execute function cms_private.unassign_schedules();

create function public.cms_manage_job(p_job uuid, p_action text, p_email text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := cms_private.schedule_admin();
  job cms_private.jobs%rowtype;
  target cms_private.access%rowtype;
  event text;
begin
  select * into job from cms_private.jobs where id = p_job for update;
  if not found or job.status not in ('ready','unassigned','awaiting_approval') then
    raise exception 'This job is no longer pending. Reload the queue.' using errcode = 'PT409';
  end if;
  select * into strict target from cms_private.access where user_id = actor;
  case p_action
    when 'cancel' then
      update cms_private.jobs set status = 'cancelled' where id = job.id;
      event := 'schedule_cancelled';
    when 'assign' then
      if job.status <> 'unassigned' then
        raise exception 'Only an unassigned job can be assigned.' using errcode = 'PT409';
      end if;
      select * into target from cms_private.access where email = lower(btrim(p_email))
        and user_id is not null and full_admin and revoked_at is null and user_id <> job.last_approver;
      if not found then
        raise exception 'Choose another active full administrator.' using errcode = '22023';
      end if;
      update cms_private.jobs set assignee = target.user_id, status = 'awaiting_approval' where id = job.id;
      event := 'schedule_reassigned';
    when 'approve' then
      if job.status <> 'awaiting_approval' or job.assignee is distinct from actor then
        raise exception 'Only the newly assigned administrator can approve this job.' using errcode = '42501';
      end if;
      update cms_private.jobs set status = 'ready', last_approver = actor where id = job.id;
      event := 'schedule_reapproved';
    else
      raise exception 'Unknown queue action.' using errcode = '22023';
  end case;
  perform cms_private.consume_mutation(actor);
  insert into cms_private.audit(actor_id, action, target_email, details)
    values (actor, event, target.email, jsonb_build_object('job',job.id,'revision',job.revision_id));
end;
$$;

create function public.cms_list_jobs(p_closed boolean, p_before bigint default null)
returns table(seq bigint, id uuid, content_id uuid, area public.cms_area, revision_id uuid, version integer,
  title text, action public.cms_publication_action, due_at timestamptz, local_minute timestamp, zone text,
  status text, assignee uuid, assignee_email text, reason text, refresh_pending boolean)
language sql stable security definer set search_path = ''
as $$
  select j.seq, j.id, j.content_id, c.area, j.revision_id, r.version, r.title, j.action, j.due_at,
    j.local_minute, j.zone, j.status, j.assignee, a.email, j.reason,
    j.status = 'executed' and j.refreshed_at is null
  from cms_private.jobs j join cms_private.content c on c.id = j.content_id
    join cms_private.revisions r on r.id = j.revision_id
    left join cms_private.access a on a.user_id = j.assignee
  where public.cms_can_publish() and (j.status in ('executed','cancelled','blocked')) = p_closed
    and (p_before is null or j.seq < p_before)
  order by j.seq desc limit 50;
$$;

create function cms_private.run_due_job(p_now timestamptz)
returns jsonb language plpgsql set search_path = ''
as $$
declare
  job cms_private.jobs%rowtype;
  result text := 'executed';
  message text;
begin
  perform pg_advisory_xact_lock(190581, 1);
  select * into job from cms_private.jobs where status = 'ready' and due_at <= p_now
    and (retry_at is null or retry_at <= p_now) order by due_at, seq limit 1 for update;
  if not found then return null; end if;
  begin
    -- Same order as manual publication: actor, content, then mutation budget.
    if not (cms_private.lock_content_actor(job.assignee)).full_admin then
      raise exception 'Publishing authority lost' using errcode = '42501';
    end if;
    perform from cms_private.content where id = job.content_id for update;
    if cms_private.latest_publication(job.content_id) is distinct from job.last_publication then
      raise exception 'Publication changed after approval.' using errcode = 'PT409';
    end if;
    perform cms_private.apply_publication(job.assignee, job.id, job.content_id, job.action,
      case when job.action = 'publish' then job.revision_id end, job.expected_live, true);
  exception
    when insufficient_privilege then
      update cms_private.jobs set status = 'unassigned', assignee = null, retry_at = null, reason = null where id = job.id;
      insert into cms_private.audit(operator_name, action, target_email, details)
        values ('local scheduler','schedule_unassigned',coalesce((select email from cms_private.access
          where user_id = job.assignee),job.assignee::text), jsonb_build_object('job',job.id,'previous_assignee',job.assignee));
      return jsonb_build_object('id', job.id, 'status', 'unassigned');
    when sqlstate 'PT429' then
      update cms_private.jobs set retry_at = p_now + interval '1 minute', reason = 'Mutation budget reached. Retry queued.'
        where id = job.id;
      return jsonb_build_object('id',job.id,'status','retry');
    when sqlstate 'PT409' or sqlstate 'PT404' or invalid_parameter_value or unique_violation then
      result := 'blocked';
      message := case when sqlstate = '23505' then 'The published slug is already in use.' else sqlerrm end;
  end;
  update cms_private.jobs set status = result, reason = message, retry_at = null where id = job.id;
  if result = 'blocked' then
    insert into cms_private.audit(operator_name, action, target_email, details)
      select 'local scheduler','schedule_blocked',email,jsonb_build_object('job',job.id,'reason',message)
        from cms_private.access where user_id = job.assignee;
  end if;
  -- The publication audit's unique operation_id is the execution record.
  return jsonb_build_object('id',job.id,'status',result);
end;
$$;

create function public.cms_run_due_job() returns jsonb language sql security definer set search_path = ''
as $$ select cms_private.run_due_job(clock_timestamp()); $$;

create function public.cms_pending_refresh() returns uuid[] language sql stable security definer set search_path = ''
as $$
  select array(select id from cms_private.jobs where status = 'executed' and refreshed_at is null order by seq limit 100);
$$;

create function public.cms_ack_refresh(p_jobs uuid[]) returns void language sql security definer set search_path = ''
as $$
  update cms_private.jobs set refreshed_at = clock_timestamp()
    where id = any(p_jobs) and status = 'executed' and refreshed_at is null;
$$;

revoke all on function cms_private.schedule_instant(text,text), cms_private.schedule_admin(),
  cms_private.latest_publication(uuid), cms_private.unassign_schedules(), cms_private.run_due_job(timestamptz),
  public.cms_schedule(uuid,public.cms_publication_action,uuid,uuid,text,text), public.cms_manage_job(uuid,text,text),
  public.cms_list_jobs(boolean,bigint), public.cms_run_due_job(), public.cms_pending_refresh(), public.cms_ack_refresh(uuid[])
  from public, anon, authenticated, service_role;
grant execute on function public.cms_schedule(uuid,public.cms_publication_action,uuid,uuid,text,text),
  public.cms_manage_job(uuid,text,text), public.cms_list_jobs(boolean,bigint) to authenticated;
grant execute on function public.cms_run_due_job(), public.cms_pending_refresh(), public.cms_ack_refresh(uuid[])
  to service_role;
