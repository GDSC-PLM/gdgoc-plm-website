create schema cms_private;
revoke all on schema cms_private from public, anon, authenticated, service_role;

create type public.cms_area as enum (
  'events', 'blogs', 'board', 'partners', 'zines', 'haribots', 'faq', 'games', 'settings'
);

create table cms_private.access (
  email text primary key check (
    email = lower(btrim(email)) and length(email) <= 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  full_admin boolean not null,
  areas public.cms_area[] not null,
  expires_at timestamptz not null,
  user_id uuid unique,
  accepted_at timestamptz,
  revoked_at timestamptz,
  check ((user_id is null) = (accepted_at is null)),
  check (full_admin and cardinality(areas) = 0 or
    not full_admin and cardinality(areas) > 0 and
    not ('settings' = any(areas)) and array_position(areas, null) is null)
);

create table cms_private.audit (
  id bigint generated always as identity primary key,
  actor_id uuid,
  operator_name text,
  action text not null,
  target_email text not null,
  occurred_at timestamptz not null default clock_timestamp(),
  details jsonb not null default '{}',
  check ((actor_id is null) <> (operator_name is null))
);

create table cms_private.sign_in_rate (
  singleton boolean primary key check (singleton),
  window_start timestamptz not null,
  attempts integer not null
);
alter table cms_private.access enable row level security;
alter table cms_private.audit enable row level security;
alter table cms_private.sign_in_rate enable row level security;

create function cms_private.google_session()
returns boolean language sql stable set search_path = ''
as $$
  select coalesce(
    auth.jwt() -> 'app_metadata' ->> 'provider' = 'google'
    and auth.jwt() -> 'amr' @> '[{"method":"oauth"}]'::jsonb, false
  );
$$;

create function public.cms_before_user_created(event jsonb)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select case when event #>> '{user,app_metadata,provider}' = 'google'
    and exists (
      select 1 from cms_private.access
      where email = lower(event #>> '{user,email}')
        and user_id is null and revoked_at is null and expires_at > now()
    )
  then '{}'::jsonb
  else '{"error":{"http_code":403,"message":"Administrator access is by invitation."}}'::jsonb
  end;
$$;

create function public.cms_accept_invitation()
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  accepted_email text;
begin
  if actor is null or not cms_private.google_session() then return false; end if;
  perform pg_advisory_xact_lock(190581, 1);
  if exists (
    select 1 from cms_private.access where user_id = actor and revoked_at is null
  ) then return true; end if;

  update cms_private.access as a
  set user_id = actor, accepted_at = clock_timestamp()
  where a.user_id is null and a.revoked_at is null and a.expires_at > clock_timestamp()
    and exists (
      select 1 from auth.identities as i
      where i.user_id = actor and i.provider = 'google'
        and i.identity_data -> 'email_verified' = 'true'::jsonb
        and lower(i.identity_data ->> 'email') = a.email
        and a.email = lower(auth.jwt() ->> 'email')
    )
    and not exists (select 1 from cms_private.access where user_id = actor)
  returning a.email into accepted_email;

  if accepted_email is null then return false; end if;
  insert into cms_private.audit (actor_id, action, target_email)
    values (actor, 'accept_invitation', accepted_email);
  return true;
end;
$$;

create function public.cms_my_access()
returns table (full_admin boolean, areas public.cms_area[])
language sql stable security definer set search_path = ''
as $$
  select a.full_admin, a.areas from cms_private.access a
  where a.user_id = auth.uid() and a.revoked_at is null and cms_private.google_session();
$$;

create function public.cms_can_edit(area public.cms_area)
returns boolean language sql stable security definer set search_path = ''
as $$
  select area is not null and exists (
    select 1 from public.cms_my_access() a where a.full_admin or area = any(a.areas)
  );
$$;

create function public.cms_can_publish()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.cms_my_access() a where a.full_admin);
$$;

create function public.cms_list_access()
returns table (email text, full_admin boolean, areas public.cms_area[], expires_at timestamptz,
  accepted_at timestamptz, revoked_at timestamptz, pending boolean)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.cms_can_publish() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  return query select a.email, a.full_admin, a.areas, a.expires_at, a.accepted_at, a.revoked_at,
    a.accepted_at is null and a.revoked_at is null and a.expires_at > now()
    from cms_private.access a order by a.email;
end;
$$;

create function public.cms_manage_access(
  operation text, target text, grant_full boolean default false,
  grant_areas public.cms_area[] default '{}', days_valid integer default 7
)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  target_email text := lower(btrim(target));
  target_access cms_private.access%rowtype;
  expiry timestamptz;
begin
  perform pg_advisory_xact_lock(190581, 1);
  if not public.cms_can_publish() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  select * into target_access from cms_private.access where email = target_email;

  if target_access.full_admin and target_access.user_id is not null and target_access.revoked_at is null
    and (operation = 'revoke' or operation = 'update_permissions' and grant_full is false)
    and not exists (
      select 1 from cms_private.access where full_admin and user_id is not null
        and revoked_at is null and email <> target_email
    ) then
    raise exception 'Activate a replacement full administrator first' using errcode = '22023';
  end if;

  case operation
    when 'invite' then
      if days_valid is null or days_valid not between 1 and 30 then
        raise exception 'Invitation expiry must be between 1 and 30 days' using errcode = '22023';
      end if;
      if target_access.user_id is not null or target_access.revoked_at is not null then
        raise exception 'This address is already bound or revoked' using errcode = '22023';
      end if;
      expiry := clock_timestamp() + make_interval(days => days_valid);
      insert into cms_private.access (email, full_admin, areas, expires_at)
      values (target_email, grant_full, grant_areas, expiry)
      on conflict (email) do update
        set full_admin = excluded.full_admin, areas = excluded.areas, expires_at = excluded.expires_at;
    when 'update_permissions' then
      if target_access.user_id is null or target_access.revoked_at is not null then
        raise exception 'No active account for this address' using errcode = '22023';
      end if;
      update cms_private.access set full_admin = grant_full, areas = grant_areas where email = target_email;
    when 'cancel_invitation' then
      if target_access.email is null or target_access.user_id is not null
        or target_access.expires_at <= clock_timestamp() then
        raise exception 'No pending invitation for this address' using errcode = '22023';
      end if;
      update cms_private.access set expires_at = clock_timestamp() where email = target_email;
    when 'revoke' then
      if target_access.user_id is null or target_access.revoked_at is not null then
        raise exception 'No active account for this address' using errcode = '22023';
      end if;
      update cms_private.access set revoked_at = clock_timestamp() where email = target_email;
    else
      raise exception 'Unknown access operation' using errcode = '22023';
  end case;

  insert into cms_private.audit (actor_id, action, target_email, details)
    values (auth.uid(), operation, target_email, case when operation = 'invite'
      then jsonb_build_object('full_admin', grant_full, 'areas', grant_areas, 'expires_at', expiry)
      when operation = 'update_permissions'
      then jsonb_build_object('full_admin', grant_full, 'areas', grant_areas)
      else '{}'::jsonb end);
end;
$$;

create function cms_private.invite_operator_admin(target text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  target_email text := lower(btrim(target));
  expiry timestamptz := clock_timestamp() + interval '1 day';
begin
  perform pg_advisory_xact_lock(190581, 1);
  insert into cms_private.access (email, full_admin, areas, expires_at)
  values (target_email, true, '{}', expiry)
  on conflict (email) do update set full_admin = true, areas = '{}', expires_at = excluded.expires_at
    where access.user_id is null and access.revoked_at is null;
  if not found then raise exception 'Use a new address for operator recovery'; end if;

  insert into cms_private.audit (operator_name, action, target_email, details)
    values (session_user, 'operator_invite', target_email, jsonb_build_object('expires_at', expiry));
end;
$$;

create function public.cms_limit_sign_in()
returns boolean language sql security definer set search_path = ''
as $$
  -- Keep one bounded row and serialize competing requests in the same minute.
  with attempt as (
    insert into cms_private.sign_in_rate as r values (true, date_trunc('minute', now()), 1)
    on conflict (singleton) do update
      set window_start = greatest(r.window_start, excluded.window_start),
          attempts = case when r.window_start < excluded.window_start then 1 else r.attempts + 1 end
      where r.window_start < excluded.window_start or r.attempts < 30
    returning 1
  )
  select exists (select 1 from attempt);
$$;

revoke all on all functions in schema cms_private from public, anon, authenticated, service_role;
revoke all on function public.cms_before_user_created(jsonb), public.cms_accept_invitation(),
  public.cms_my_access(), public.cms_can_edit(public.cms_area), public.cms_can_publish(),
  public.cms_list_access(), public.cms_manage_access(text, text, boolean, public.cms_area[], integer),
  public.cms_limit_sign_in() from public, anon, authenticated, service_role;

grant execute on function public.cms_before_user_created(jsonb) to supabase_auth_admin;
grant execute on function public.cms_accept_invitation(), public.cms_my_access(),
  public.cms_can_edit(public.cms_area), public.cms_can_publish(), public.cms_list_access(),
  public.cms_manage_access(text, text, boolean, public.cms_area[], integer) to authenticated;
grant execute on function public.cms_limit_sign_in() to service_role;
