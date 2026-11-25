create type public.cms_publication_action as enum ('publish', 'unpublish', 'archive');

create type public.cms_publication_effect as (
  content_id uuid,
  area public.cms_area,
  action public.cms_publication_action,
  previous_slug text,
  current_slug text,
  published_revision_id uuid
);

create table cms_private.content (
  id uuid primary key default gen_random_uuid(),
  area public.cms_area not null,
  draft_revision_id uuid not null,
  published_revision_id uuid,
  published_slug text,
  archived_at timestamptz,
  unique (area, published_slug),
  check ((published_revision_id is null) = (published_slug is null)),
  check (archived_at is null or published_revision_id is null)
);

create table cms_private.revisions (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references cms_private.content (id),
  version integer not null check (version > 0),
  title text not null check (char_length(title) <= 160),
  slug text check (char_length(slug) <= 100 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  fields jsonb not null check (jsonb_typeof(fields) = 'object' and octet_length(fields::text) <= 65536),
  saved_by uuid not null,
  saved_at timestamptz not null default clock_timestamp(),
  restored_from_revision_id uuid,
  unique (content_id, version),
  unique (content_id, id),
  unique (content_id, id, slug),
  foreign key (content_id, restored_from_revision_id) references cms_private.revisions (content_id, id)
);

alter table cms_private.content
  add foreign key (id, draft_revision_id) references cms_private.revisions (content_id, id)
    deferrable initially deferred,
  add foreign key (id, published_revision_id, published_slug)
    references cms_private.revisions (content_id, id, slug);

create table cms_private.content_audit (
  id bigint generated always as identity primary key,
  content_id uuid not null references cms_private.content (id),
  actor_id uuid not null,
  action text not null check (action in ('create', 'save', 'restore', 'publish', 'unpublish', 'archive')),
  revision_id uuid not null,
  previous_published_revision_id uuid,
  occurred_at timestamptz not null default clock_timestamp(),
  operation_id uuid unique,
  publication_request jsonb,
  publication_effect public.cms_publication_effect,
  foreign key (content_id, revision_id) references cms_private.revisions (content_id, id),
  foreign key (content_id, previous_published_revision_id) references cms_private.revisions (content_id, id)
);
create index cms_content_audit_history on cms_private.content_audit (content_id, id desc);

create table cms_private.mutation_rate (
  actor_id uuid primary key,
  window_start timestamptz not null,
  mutations integer not null check (mutations between 1 and 60)
);

alter table cms_private.content enable row level security;
alter table cms_private.revisions enable row level security;
alter table cms_private.content_audit enable row level security;
alter table cms_private.mutation_rate enable row level security;
revoke all on cms_private.content, cms_private.revisions, cms_private.content_audit,
  cms_private.mutation_rate from public, anon, authenticated, service_role;

create function cms_private.reject_content_history_change()
returns trigger language plpgsql set search_path = ''
as $$
begin
  raise exception 'CMS history is immutable' using errcode = '55000';
end;
$$;

create trigger cms_revisions_immutable
before update or delete or truncate on cms_private.revisions
for each statement execute function cms_private.reject_content_history_change();

create trigger cms_content_audit_immutable
before update or delete or truncate on cms_private.content_audit
for each statement execute function cms_private.reject_content_history_change();

-- Lock the access row before a write so role changes and revocation cannot race it.
create function cms_private.lock_content_actor(p_actor_id uuid)
returns cms_private.access language plpgsql set search_path = ''
as $$
declare
  actor cms_private.access%rowtype;
begin
  select * into actor from cms_private.access
  where user_id = p_actor_id and revoked_at is null for share;
  if not found then
    raise exception 'Active CMS access required' using errcode = '42501';
  end if;
  return actor;
end;
$$;

create function cms_private.consume_mutation(p_actor_id uuid)
returns void language plpgsql set search_path = ''
as $$
begin
  insert into cms_private.mutation_rate as r
    values (p_actor_id, date_trunc('minute', clock_timestamp()), 1)
  on conflict (actor_id) do update
    set window_start = greatest(r.window_start, excluded.window_start),
        mutations = case when r.window_start < excluded.window_start then 1 else r.mutations + 1 end
    where r.window_start < excluded.window_start or r.mutations < 60;
  if not found then
    raise exception 'CMS mutation limit reached' using errcode = 'PT429';
  end if;
end;
$$;

create function public.cms_create_content(p_area public.cms_area, p_title text, p_slug text, p_fields jsonb)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  actor cms_private.access%rowtype;
  new_content_id uuid := gen_random_uuid();
  new_revision_id uuid := gen_random_uuid();
begin
  if not cms_private.google_session() then
    raise exception 'CMS session required' using errcode = '42501';
  end if;
  actor := cms_private.lock_content_actor(auth.uid());
  if p_area is null or not (actor.full_admin or p_area = any(actor.areas)) then
    raise exception 'CMS editing scope required' using errcode = '42501';
  end if;
  perform cms_private.consume_mutation(actor.user_id);

  insert into cms_private.content (id, area, draft_revision_id)
    values (new_content_id, p_area, new_revision_id);
  insert into cms_private.revisions (id, content_id, version, title, slug, fields, saved_by)
    values (new_revision_id, new_content_id, 1, btrim(p_title), nullif(btrim(p_slug), ''), p_fields, actor.user_id);
  insert into cms_private.content_audit (content_id, actor_id, action, revision_id)
    values (new_content_id, actor.user_id, 'create', new_revision_id);
  return new_content_id;
end;
$$;

create function public.cms_write_draft(
  p_content_id uuid, p_expected_draft_id uuid,
  p_title text default null, p_slug text default null, p_fields jsonb default null,
  p_source_revision_id uuid default null
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  actor cms_private.access%rowtype;
  item cms_private.content%rowtype;
  source cms_private.revisions%rowtype;
  new_version integer;
  new_revision_id uuid;
begin
  if not cms_private.google_session() then
    raise exception 'CMS session required' using errcode = '42501';
  end if;
  actor := cms_private.lock_content_actor(auth.uid());
  select * into item from cms_private.content
    where id = p_content_id and (actor.full_admin or area = any(actor.areas)) for update;
  if not found then
    raise exception 'Content not found' using errcode = 'PT404';
  end if;
  if item.archived_at is not null or item.draft_revision_id is distinct from p_expected_draft_id then
    raise exception 'Draft changed or content was archived' using errcode = 'PT409';
  end if;

  select version + 1 into strict new_version from cms_private.revisions where id = item.draft_revision_id;
  if p_source_revision_id is not null then
    if p_title is not null or p_slug is not null or p_fields is not null then
      raise exception 'Restore accepts only a source revision' using errcode = '22023';
    end if;
    select * into source from cms_private.revisions
      where content_id = p_content_id and id = p_source_revision_id;
    if not found then
      raise exception 'Source revision not found' using errcode = 'PT404';
    end if;
    p_title := source.title;
    p_slug := source.slug;
    p_fields := source.fields;
  end if;

  perform cms_private.consume_mutation(actor.user_id);
  insert into cms_private.revisions (content_id, version, title, slug, fields, saved_by, restored_from_revision_id)
    values (p_content_id, new_version, btrim(p_title), nullif(btrim(p_slug), ''), p_fields, actor.user_id, p_source_revision_id)
    returning id into new_revision_id;
  update cms_private.content set draft_revision_id = new_revision_id where id = p_content_id;
  insert into cms_private.content_audit (content_id, actor_id, action, revision_id)
    values (p_content_id, actor.user_id,
      case when p_source_revision_id is null then 'save' else 'restore' end, new_revision_id);
  return new_revision_id;
end;
$$;

-- Stage 3 will extend this check with content schemas and immutable media references.
create function cms_private.validate_publish_revision(p_revision cms_private.revisions)
returns void language plpgsql set search_path = ''
as $$
begin
  if p_revision.title !~ '[^[:space:]]' or p_revision.slug is null then
    raise exception 'Publication requires a title and slug' using errcode = '22023';
  end if;
end;
$$;

-- Both the editor and a future trusted job runner use this transaction.
-- Only the job runner may pass the revision pinned by an earlier approval.
create function cms_private.apply_publication(
  p_actor_id uuid, p_operation_id uuid, p_content_id uuid,
  p_action public.cms_publication_action, p_revision_id uuid,
  p_expected_published_id uuid, p_pinned boolean default false
)
returns public.cms_publication_effect language plpgsql set search_path = ''
as $$
declare
  actor cms_private.access%rowtype;
  item cms_private.content%rowtype;
  chosen cms_private.revisions%rowtype;
  prior cms_private.content_audit%rowtype;
  effect public.cms_publication_effect;
  next_published_id uuid;
  next_slug text;
  audit_revision_id uuid;
  request jsonb := jsonb_build_array(p_action, p_revision_id, p_expected_published_id, p_pinned);
begin
  actor := cms_private.lock_content_actor(p_actor_id);
  if not actor.full_admin then
    raise exception 'CMS publishing permission required' using errcode = '42501';
  end if;
  if p_operation_id is null or p_action is null or p_pinned is null or
    (p_pinned and p_action = 'archive') or
    ((p_action = 'unpublish') <> (p_revision_id is null)) then
    raise exception 'Invalid publication request' using errcode = '22023';
  end if;

  select * into item from cms_private.content where id = p_content_id for update;
  if not found then
    raise exception 'Content not found' using errcode = 'PT404';
  end if;

  select * into prior from cms_private.content_audit where operation_id = p_operation_id;
  if found then
    if prior.content_id = p_content_id and prior.actor_id = p_actor_id and prior.publication_request = request then
      return prior.publication_effect;
    end if;
    raise exception 'Publication operation ID was already used' using errcode = 'PT409';
  end if;
  if item.archived_at is not null or item.published_revision_id is distinct from p_expected_published_id then
    raise exception 'Published state changed or content was archived' using errcode = 'PT409';
  end if;

  case p_action
    when 'publish' then
      select * into chosen from cms_private.revisions where content_id = item.id and id = p_revision_id;
      if not found then
        raise exception 'Revision not found for this content' using errcode = 'PT404';
      end if;
      if (not p_pinned and item.draft_revision_id <> p_revision_id) or item.published_revision_id = p_revision_id then
        raise exception 'Draft changed or revision is already public' using errcode = 'PT409';
      end if;
      perform cms_private.validate_publish_revision(chosen);
      next_published_id := chosen.id;
      next_slug := chosen.slug;
      audit_revision_id := chosen.id;
    when 'unpublish' then
      if item.published_revision_id is null then
        raise exception 'Content is already unpublished' using errcode = 'PT409';
      end if;
      audit_revision_id := item.published_revision_id;
    when 'archive' then
      if item.draft_revision_id <> p_revision_id then
        raise exception 'Draft changed' using errcode = 'PT409';
      end if;
      audit_revision_id := item.draft_revision_id;
  end case;

  perform cms_private.consume_mutation(p_actor_id);
  effect := row(item.id, item.area, p_action, item.published_slug, next_slug, next_published_id);
  update cms_private.content set
    published_revision_id = next_published_id,
    published_slug = next_slug,
    archived_at = case when p_action = 'archive' then clock_timestamp() end
  where id = item.id;
  insert into cms_private.content_audit (
    content_id, actor_id, action, revision_id, previous_published_revision_id,
    operation_id, publication_request, publication_effect
  ) values (
    item.id, p_actor_id, p_action::text, audit_revision_id, item.published_revision_id,
    p_operation_id, request, effect
  );
  return effect;
end;
$$;

create function public.cms_apply_publication(
  p_operation_id uuid, p_content_id uuid, p_action public.cms_publication_action,
  p_revision_id uuid, p_expected_published_id uuid
)
returns setof public.cms_publication_effect language plpgsql security definer set search_path = ''
as $$
begin
  if not cms_private.google_session() then
    raise exception 'CMS session required' using errcode = '42501';
  end if;
  return next cms_private.apply_publication(auth.uid(), p_operation_id, p_content_id,
    p_action, p_revision_id, p_expected_published_id);
end;
$$;

create function public.cms_get_content(p_content_id uuid)
returns table (id uuid, area public.cms_area, draft_revision_id uuid, published_revision_id uuid, archived_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select c.id, c.area, c.draft_revision_id, c.published_revision_id, c.archived_at
  from cms_private.content c where c.id = p_content_id and public.cms_can_edit(c.area);
$$;

create function public.cms_get_revision(p_content_id uuid, p_revision_id uuid)
returns table (id uuid, version integer, title text, slug text, fields jsonb,
  saved_by uuid, saved_at timestamptz, restored_from_revision_id uuid)
language sql stable security definer set search_path = ''
as $$
  select r.id, r.version, r.title, r.slug, r.fields, r.saved_by, r.saved_at, r.restored_from_revision_id
  from cms_private.revisions r join cms_private.content c on c.id = r.content_id
  where c.id = p_content_id and r.id = p_revision_id and public.cms_can_edit(c.area);
$$;

create function public.cms_revision_history(p_content_id uuid, p_before_version integer default null)
returns table (id uuid, version integer, title text, saved_by uuid, saved_at timestamptz, restored_from_revision_id uuid)
language sql stable security definer set search_path = ''
as $$
  select r.id, r.version, r.title, r.saved_by, r.saved_at, r.restored_from_revision_id
  from cms_private.revisions r join cms_private.content c on c.id = r.content_id
  where c.id = p_content_id and public.cms_can_edit(c.area)
    and (p_before_version is null or r.version < p_before_version)
  order by r.version desc limit 50;
$$;

create function public.cms_content_activity(p_content_id uuid, p_before_event bigint default null)
returns table (id bigint, action text, actor_id uuid, occurred_at timestamptz, revision_id uuid,
  previous_published_revision_id uuid)
language sql stable security definer set search_path = ''
as $$
  select a.id, a.action, a.actor_id, a.occurred_at, a.revision_id, a.previous_published_revision_id
  from cms_private.content_audit a join cms_private.content c on c.id = a.content_id
  where c.id = p_content_id and public.cms_can_edit(c.area)
    and (p_before_event is null or a.id < p_before_event)
  order by a.id desc limit 50;
$$;

-- Public callers get only the current visible revision and its allowlisted fields.
create function public.cms_read_published(p_content_id uuid)
returns table (id uuid, area public.cms_area, title text, slug text)
language sql stable security definer set search_path = ''
as $$
  select c.id, c.area, r.title, r.slug
  from cms_private.content c join cms_private.revisions r
    on r.content_id = c.id and r.id = c.published_revision_id
  where c.id = p_content_id and c.archived_at is null;
$$;

revoke all on function cms_private.reject_content_history_change(), cms_private.lock_content_actor(uuid),
  cms_private.consume_mutation(uuid), cms_private.validate_publish_revision(cms_private.revisions),
  cms_private.apply_publication(uuid, uuid, uuid, public.cms_publication_action, uuid, uuid, boolean)
  from public, anon, authenticated, service_role;

revoke all on function public.cms_create_content(public.cms_area, text, text, jsonb),
  public.cms_write_draft(uuid, uuid, text, text, jsonb, uuid),
  public.cms_apply_publication(uuid, uuid, public.cms_publication_action, uuid, uuid),
  public.cms_get_content(uuid), public.cms_get_revision(uuid, uuid), public.cms_revision_history(uuid, integer),
  public.cms_content_activity(uuid, bigint), public.cms_read_published(uuid)
  from public, anon, authenticated, service_role;

grant execute on function public.cms_create_content(public.cms_area, text, text, jsonb),
  public.cms_write_draft(uuid, uuid, text, text, jsonb, uuid),
  public.cms_apply_publication(uuid, uuid, public.cms_publication_action, uuid, uuid),
  public.cms_get_content(uuid), public.cms_get_revision(uuid, uuid), public.cms_revision_history(uuid, integer),
  public.cms_content_activity(uuid, bigint) to authenticated;

grant execute on function public.cms_read_published(uuid) to anon, authenticated;
