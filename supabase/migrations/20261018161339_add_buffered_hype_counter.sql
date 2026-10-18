create table public.hype_streams (
  stream_id uuid primary key,
  acknowledged_through bigint not null default 0
    check (acknowledged_through between 0 and 9007199254740991)
);

alter table public.hype_streams enable row level security;
revoke all on table public.hype_streams from public, anon, authenticated, service_role;
grant select, insert, update on table public.hype_streams to service_role;

create function public.get_hype_snapshot(p_stream_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'count', counter.count,
    'acknowledgedThrough', coalesce(stream.acknowledged_through, 0)
  )
  from public.hype_counter as counter
  left join public.hype_streams as stream on stream.stream_id = p_stream_id
  where counter.id = true;
$$;

create function public.increment_hype_batch(p_browser_id uuid, p_stream_id uuid, p_through bigint)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  acknowledged bigint;
  amount bigint;
  recent_taps timestamptz[];
  tap_time timestamptz;
  next_count bigint;
begin
  if p_browser_id is null or p_stream_id is null or p_through is null
     or p_through < 1 or p_through > 9007199254740991 then
    raise exception using errcode = '22023', message = 'invalid_hype_batch';
  end if;

  insert into public.hype_streams (stream_id) values (p_stream_id)
  on conflict (stream_id) do nothing;

  select acknowledged_through into strict acknowledged
  from public.hype_streams where stream_id = p_stream_id for update;

  -- Retried and overlapping batches only add the part not already acknowledged.
  if p_through <= acknowledged then
    return public.get_hype_snapshot(p_stream_id);
  end if;
  amount := p_through - acknowledged;
  if amount > 10 then
    raise exception using errcode = '22023', message = 'invalid_hype_batch';
  end if;

  insert into public.hype_rate_limits (browser_id) values (p_browser_id)
  on conflict (browser_id) do nothing;
  select taps into strict recent_taps
  from public.hype_rate_limits where browser_id = p_browser_id for update;
  tap_time := clock_timestamp();
  select coalesce(array_agg(recent_tap), '{}'::timestamptz[]) into recent_taps
  from unnest(recent_taps) as recent_tap
  where recent_tap > tap_time - interval '1 second';
  if cardinality(recent_taps) + amount > 10 then
    raise exception using errcode = 'P0001', message = 'hype_rate_limited';
  end if;

  update public.hype_rate_limits
  set taps = recent_taps || array_fill(tap_time, array[amount::integer]), updated_at = tap_time
  where browser_id = p_browser_id;
  update public.hype_counter set count = count + amount
  where id = true returning count into strict next_count;
  update public.hype_streams set acknowledged_through = p_through where stream_id = p_stream_id;

  delete from public.hype_rate_limits where browser_id in (
    select browser_id from public.hype_rate_limits
    where updated_at < tap_time - interval '1 hour'
    order by updated_at limit 100 for update skip locked
  );

  return jsonb_build_object('count', next_count, 'acknowledgedThrough', p_through);
end;
$$;

revoke all on function public.get_hype_snapshot(uuid), public.increment_hype_batch(uuid, uuid, bigint)
  from public, anon, authenticated, service_role;
grant execute on function public.get_hype_snapshot(uuid), public.increment_hype_batch(uuid, uuid, bigint)
  to service_role;
