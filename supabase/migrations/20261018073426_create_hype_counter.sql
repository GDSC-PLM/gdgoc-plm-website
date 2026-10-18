create table public.hype_counter (
  id boolean primary key default true check (id),
  count bigint not null default 0 check (count between 0 and 9007199254740991)
);

insert into public.hype_counter (id, count) values (true, 0);

create table public.hype_rate_limits (
  browser_id uuid primary key,
  taps timestamptz[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint hype_rate_limits_max_taps check (cardinality(taps) <= 10)
);

create index hype_rate_limits_updated_at_idx
  on public.hype_rate_limits (updated_at);

alter table public.hype_counter enable row level security;
alter table public.hype_rate_limits enable row level security;

revoke all on table public.hype_counter, public.hype_rate_limits
  from public, anon, authenticated, service_role;

grant select, update on table public.hype_counter to service_role;
grant select, insert, update, delete on table public.hype_rate_limits to service_role;

create function public.increment_hype(p_browser_id uuid)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  recent_taps timestamptz[];
  tap_time timestamptz;
  next_count bigint;
begin
  if p_browser_id is null then
    raise exception 'A browser ID is required';
  end if;

  insert into public.hype_rate_limits (browser_id)
  values (p_browser_id)
  on conflict (browser_id) do nothing;

  -- The lock makes concurrent taps from the same browser share one allowance.
  select taps into recent_taps
  from public.hype_rate_limits
  where browser_id = p_browser_id
  for update;

  tap_time := clock_timestamp();

  select coalesce(array_agg(recent_tap), '{}'::timestamptz[])
  into recent_taps
  from unnest(recent_taps) as recent_tap
  where recent_tap > tap_time - interval '1 second';

  if cardinality(recent_taps) >= 10 then
    raise exception using errcode = 'P0001', message = 'hype_rate_limited';
  end if;

  update public.hype_rate_limits
  set taps = array_append(recent_taps, tap_time), updated_at = tap_time
  where browser_id = p_browser_id;

  update public.hype_counter
  set count = count + 1
  where id = true
  returning count into strict next_count;

  -- Cleanup follows the counter lock and skips browsers currently sending taps.
  delete from public.hype_rate_limits
  where browser_id in (
    select browser_id
    from public.hype_rate_limits
    where updated_at < tap_time - interval '1 hour'
    order by updated_at
    limit 100
    for update skip locked
  );

  return next_count;
end;
$$;

revoke all on function public.increment_hype(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.increment_hype(uuid) to service_role;
