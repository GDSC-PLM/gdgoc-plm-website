insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cms-media', 'cms-media', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

-- A future general Storage policy must not grant direct access to CMS bytes.
create policy cms_media_server_only on storage.objects as restrictive for all to anon, authenticated
using (bucket_id <> 'cms-media') with check (bucket_id <> 'cms-media');

create table cms_private.media (
  id uuid primary key,
  area public.cms_area not null check (area <> 'settings'),
  kind text not null check (kind in ('image', 'pdf')),
  check (kind <> 'pdf' or area = 'zines')
);

create table cms_private.media_versions (
  id uuid primary key,
  media_id uuid not null references cms_private.media (id),
  original_name text not null check (char_length(original_name) between 1 and 160 and original_name !~ '[[:cntrl:]/\\]'),
  mime text not null check (mime in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  bytes integer not null check (bytes > 0),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  width integer,
  height integer,
  uploaded_by uuid not null,
  uploaded_at timestamptz not null default clock_timestamp(),
  check (
    (mime = 'application/pdf' and bytes <= 10485760 and width is null and height is null) or
    (mime <> 'application/pdf' and bytes <= 5242880 and width is not null and height is not null
      and width between 1 and 4096 and height between 1 and 4096 and width * height <= 12000000)
  )
);
create index cms_media_versions_latest on cms_private.media_versions (media_id, uploaded_at desc, id desc);
create index cms_media_by_area on cms_private.media (area, id);

create table cms_private.revision_media (
  revision_id uuid not null references cms_private.revisions (id),
  slot text not null,
  version_id uuid not null references cms_private.media_versions (id),
  alt text check (char_length(alt) <= 250),
  primary key (revision_id, slot)
);
create index cms_media_used_by_revision on cms_private.revision_media (version_id, revision_id);
create index cms_content_live_revision on cms_private.content (published_revision_id) where archived_at is null;

create table cms_private.upload_rate (
  actor_id uuid primary key,
  window_start timestamptz not null,
  attempts integer not null check (attempts between 1 and 8)
);

alter table cms_private.media enable row level security;
alter table cms_private.media_versions enable row level security;
alter table cms_private.revision_media enable row level security;
alter table cms_private.upload_rate enable row level security;
revoke all on cms_private.media, cms_private.media_versions, cms_private.revision_media,
  cms_private.upload_rate from public, anon, authenticated, service_role;

create trigger cms_media_immutable before update or delete or truncate on cms_private.media
for each statement execute function cms_private.reject_content_history_change();

create trigger cms_media_versions_immutable before update or delete or truncate on cms_private.media_versions
for each statement execute function cms_private.reject_content_history_change();

create trigger cms_revision_media_immutable before update or delete or truncate on cms_private.revision_media
for each statement execute function cms_private.reject_content_history_change();

create function cms_private.content_schema(p_area public.cms_area)
returns jsonb language sql immutable set search_path = ''
as $$
  select '{
    "category":{"type":"line","max":60},
    "tags":{"type":"labels"},
    "topics":{"type":"labels"},
    "statusLabel":{"type":"line","max":60},
    "sortOrder":{"type":"order"},
    "featured":{"type":"boolean"},
    "metaTitle":{"type":"line","max":70},
    "metaDescription":{"type":"line","max":170},
    "socialImage":{"type":"image"}
  }'::jsonb || case p_area
    when 'events' then '{
      "startsAt":{"type":"instant","required":true},
      "endsAt":{"type":"instant"},
      "mode":{"type":"choice","values":["in-person","online","hybrid"],"required":true},
      "venue":{"type":"line","max":160},
      "description":{"type":"markdown","max":16000,"required":true},
      "cover":{"type":"image","required":true},
      "registrationUrl":{"type":"registration","required":true}
    }'::jsonb
    when 'blogs' then '{
      "category":{"type":"choice","values":["project","past-event","initiative"],"required":true},
      "body":{"type":"markdown","max":24000,"required":true},
      "cover":{"type":"image"}
    }'::jsonb
    when 'board' then '{
      "role":{"type":"line","max":120,"required":true},
      "bio":{"type":"markdown","max":6000,"required":true},
      "photo":{"type":"image"}
    }'::jsonb
    when 'partners' then '{
      "kind":{"type":"choice","values":["partner","sponsor"],"required":true},
      "description":{"type":"markdown","max":6000,"required":true},
      "websiteUrl":{"type":"https"},
      "logo":{"type":"image"}
    }'::jsonb
    when 'zines' then '{
      "issueLabel":{"type":"line","max":80,"required":true},
      "releaseDate":{"type":"date","required":true},
      "description":{"type":"markdown","max":6000,"required":true},
      "cover":{"type":"image"},
      "download":{"type":"pdf","required":true}
    }'::jsonb
    when 'haribots' then '{
      "description":{"type":"markdown","max":6000,"required":true},
      "photo":{"type":"image"}
    }'::jsonb
    when 'faq' then '{
      "answer":{"type":"markdown","max":6000,"required":true}
    }'::jsonb
    when 'games' then '{
      "description":{"type":"markdown","max":6000,"required":true},
      "instructions":{"type":"markdown","max":6000,"required":true},
      "outboundUrl":{"type":"game","required":true},
      "cover":{"type":"image"}
    }'::jsonb
  end;
$$;

create function public.cms_content_schema(p_area public.cms_area)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select cms_private.content_schema(p_area) where public.cms_can_edit(p_area);
$$;

create function cms_private.allowed_content_url(p_url text, p_kind text)
returns boolean language sql immutable set search_path = ''
as $$
  select coalesce(char_length(p_url) <= 2048
    and p_url ~ '^https://([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}([/?#]|$)'
    and p_url !~ '[[:space:][:cntrl:]\\]'
    and p_url !~* '%(00|0a|0d|5c)'
    and case p_kind
      when 'registration' then p_url ~ '^https://(forms\.gle/[^/?#]+|docs\.google\.com/forms/[^?#]+|(lu\.ma|luma\.com)/[^/?#]+)'
      when 'game' then p_url ~ '^https://(([a-z0-9][a-z0-9-]*\.)?itch\.io/[^/?#]+|gd\.games/[^/?#]+|www\.newgrounds\.com/portal/view/[0-9]+([/?#]|$))'
      else true
    end, false);
$$;

create function cms_private.validate_content_fields(p_area public.cms_area, p_fields jsonb, p_publish boolean)
returns void language plpgsql set search_path = ''
as $$
declare
  rules jsonb := cms_private.content_schema(p_area);
  field text;
  rule jsonb;
  value jsonb;
  value_text text;
  kind text;
  valid boolean;
begin
  if rules is null or jsonb_typeof(p_fields) is distinct from 'object' then
    raise exception 'Content fields are unavailable or malformed' using errcode = '22023';
  end if;

  for field, value in select key, e.value from jsonb_each(p_fields) e loop
    rule := rules -> field;
    kind := rule ->> 'type';
    value_text := value #>> '{}';
    valid := case kind
      when 'line' then jsonb_typeof(value) = 'string' and char_length(value_text) <= (rule ->> 'max')::int
        and value_text !~ '[[:cntrl:]]'
      when 'markdown' then jsonb_typeof(value) = 'string' and char_length(value_text) <= (rule ->> 'max')::int
      when 'choice' then jsonb_typeof(value) = 'string' and (rule -> 'values') ? value_text
      when 'boolean' then jsonb_typeof(value) = 'boolean'
      when 'order' then jsonb_typeof(value) = 'number' and value_text ~ '^[0-9]{1,4}$'
      when 'labels' then case when jsonb_typeof(value) = 'array' then jsonb_array_length(value) <= 12
        and not exists (select 1 from jsonb_array_elements(value) label
          where jsonb_typeof(label) <> 'string' or char_length(label #>> '{}') > 40
            or (label #>> '{}') !~ '[^[:space:]]' or (label #>> '{}') ~ '[[:cntrl:]]') else false end
      when 'instant' then jsonb_typeof(value) = 'string'
        and value_text ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$'
      when 'date' then jsonb_typeof(value) = 'string' and value_text ~ '^\d{4}-\d{2}-\d{2}$'
      when 'https' then jsonb_typeof(value) = 'string' and cms_private.allowed_content_url(value_text, kind)
      when 'registration' then jsonb_typeof(value) = 'string' and cms_private.allowed_content_url(value_text, kind)
      when 'game' then jsonb_typeof(value) = 'string' and cms_private.allowed_content_url(value_text, kind)
      when 'image' then jsonb_typeof(value) = 'object' and value = jsonb_build_object(
        'versionId', value -> 'versionId', 'alt', value -> 'alt')
        and jsonb_typeof(value -> 'alt') = 'string' and char_length(value ->> 'alt') <= 250
        and (value ->> 'alt') !~ '[[:cntrl:]]'
      when 'pdf' then jsonb_typeof(value) = 'object' and value = jsonb_build_object('versionId', value -> 'versionId')
      else false
    end;
    if valid is distinct from true then
      raise exception 'Invalid content field' using errcode = '22023', detail = field;
    end if;
    if kind in ('image', 'pdf') and (
      jsonb_typeof(value -> 'versionId') is distinct from 'string' or
      (value ->> 'versionId') !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
    ) then
      raise exception 'Invalid media version' using errcode = '22023', detail = field;
    end if;
    begin
      if kind = 'instant' then perform value_text::timestamptz; end if;
      if kind = 'date' then perform value_text::date; end if;
    exception when invalid_datetime_format or datetime_field_overflow then
      raise exception 'Invalid calendar date or time' using errcode = '22023', detail = field;
    end;
  end loop;

  if p_area = 'events' and p_fields ?& array['startsAt', 'endsAt'] and
    (p_fields ->> 'endsAt')::timestamptz < (p_fields ->> 'startsAt')::timestamptz then
    raise exception 'The event ends before it starts' using errcode = '22023', detail = 'endsAt';
  end if;

  if p_publish then
    for field, rule in select key, e.value from jsonb_each(rules) e where e.value -> 'required' = 'true' loop
      if not (p_fields ? field) or (p_fields ->> field) !~ '[^[:space:]]' then
        raise exception 'Publication requires this field' using errcode = '22023', detail = field;
      end if;
    end loop;
    if p_area = 'events' and p_fields ->> 'mode' in ('in-person', 'hybrid')
      and coalesce(p_fields ->> 'venue', '') !~ '[^[:space:]]' then
      raise exception 'In-person or hybrid events require a venue' using errcode = '22023', detail = 'venue';
    end if;
  end if;
end;
$$;

create function cms_private.attach_revision_media()
returns trigger language plpgsql set search_path = ''
as $$
declare
  content_area public.cms_area;
  field text;
  value jsonb;
  field_kind text;
begin
  if new.restored_from_revision_id is not null then
    insert into cms_private.revision_media (revision_id, slot, version_id, alt)
      select new.id, slot, version_id, alt from cms_private.revision_media
      where revision_id = new.restored_from_revision_id;
    return new;
  end if;

  select c.area into strict content_area from cms_private.content c where c.id = new.content_id;
  perform cms_private.validate_content_fields(content_area, new.fields, false);

  for field, value in select key, e.value from jsonb_each(new.fields) e loop
    field_kind := cms_private.content_schema(content_area) -> field ->> 'type';
    if field_kind not in ('image', 'pdf') then continue; end if;
    insert into cms_private.revision_media (revision_id, slot, version_id, alt)
      select new.id, field, v.id, value ->> 'alt'
      from cms_private.media_versions v join cms_private.media m on m.id = v.media_id
      where v.id = (value ->> 'versionId')::uuid and m.area = content_area and m.kind = field_kind;
    if not found then
      raise exception 'Media version is unavailable in this content area' using errcode = '22023', detail = field;
    end if;
  end loop;
  return new;
end;
$$;

create trigger cms_attach_revision_media after insert on cms_private.revisions
for each row execute function cms_private.attach_revision_media();

create function cms_private.media_object_matches(p_version uuid, p_mime text, p_bytes integer)
returns boolean language sql stable set search_path = ''
as $$
  select exists (select 1 from storage.objects o where o.bucket_id = 'cms-media' and o.name = p_version::text
    and o.metadata ->> 'mimetype' = p_mime and o.metadata ->> 'size' = p_bytes::text);
$$;

create or replace function cms_private.validate_publish_revision(p_revision cms_private.revisions)
returns void language plpgsql set search_path = ''
as $$
declare
  content_area public.cms_area;
  missing_slot text;
begin
  if p_revision.title !~ '[^[:space:]]' then
    raise exception 'Publication requires a title' using errcode = '22023', detail = 'title';
  end if;
  if p_revision.slug is null then
    raise exception 'Publication requires a slug' using errcode = '22023', detail = 'slug';
  end if;

  select c.area into strict content_area from cms_private.content c where c.id = p_revision.content_id;
  perform cms_private.validate_content_fields(content_area, p_revision.fields, true);

  select e.key into missing_slot from jsonb_each(p_revision.fields) e
  where (cms_private.content_schema(content_area) -> e.key ->> 'type') in ('image', 'pdf')
    and not exists (
      select 1 from cms_private.revision_media r join cms_private.media_versions v on v.id = r.version_id
        where r.revision_id = p_revision.id and r.slot = e.key and r.version_id = (e.value ->> 'versionId')::uuid
          and cms_private.media_object_matches(v.id, v.mime, v.bytes)
    ) limit 1;
  if found then
    raise exception 'Save a draft with an available media version before publishing'
      using errcode = '22023', detail = missing_slot;
  end if;
end;
$$;

create function public.cms_authorize_upload(p_area public.cms_area, p_media_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  actor cms_private.access%rowtype;
begin
  if not cms_private.google_session() then
    raise exception 'CMS session required' using errcode = '42501';
  end if;
  actor := cms_private.lock_content_actor(auth.uid());
  if p_area is null or p_area = 'settings' or not (actor.full_admin or p_area = any(actor.areas)) then
    raise exception 'CMS upload scope required' using errcode = '42501';
  end if;
  if p_media_id is not null and not exists (
    select 1 from cms_private.media where id = p_media_id and area = p_area
  ) then
    raise exception 'Media record not found' using errcode = 'PT404';
  end if;

  insert into cms_private.upload_rate as r values (actor.user_id, date_trunc('minute', clock_timestamp()), 1)
  on conflict (actor_id) do update
    set window_start = greatest(r.window_start, excluded.window_start),
        attempts = case when r.window_start < excluded.window_start then 1 else r.attempts + 1 end
    where r.window_start < excluded.window_start or r.attempts < 8;
  if not found then raise exception 'CMS upload limit reached' using errcode = 'PT429'; end if;
end;
$$;

create function public.cms_record_media_version(
  p_actor uuid, p_area public.cms_area, p_existing_media_id uuid, p_version_id uuid,
  p_name text, p_mime text, p_bytes integer, p_sha256 text, p_width integer, p_height integer
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  actor cms_private.access%rowtype;
  media_id uuid := coalesce(p_existing_media_id, gen_random_uuid());
  media_kind text := case when p_mime = 'application/pdf' then 'pdf' else 'image' end;
begin
  actor := cms_private.lock_content_actor(p_actor);
  if p_area is null or p_area = 'settings' or not (actor.full_admin or p_area = any(actor.areas)) then
    raise exception 'CMS upload scope required' using errcode = '42501';
  end if;
  if p_existing_media_id is null then
    insert into cms_private.media (id, area, kind) values (media_id, p_area, media_kind);
  else
    perform 1 from cms_private.media m where m.id = media_id and m.area = p_area and m.kind = media_kind for update;
    if not found then
      raise exception 'A replacement must match its media area and kind' using errcode = '22023';
    end if;
  end if;
  if not cms_private.media_object_matches(p_version_id, p_mime, p_bytes) then
    raise exception 'The validated Storage object is unavailable' using errcode = '22023';
  end if;

  insert into cms_private.media_versions (id, media_id, original_name, mime, bytes, sha256, width, height, uploaded_by)
    values (p_version_id, media_id, p_name, p_mime, p_bytes, p_sha256, p_width, p_height, p_actor);
  return media_id;
end;
$$;

create function public.cms_list_media(p_area public.cms_area, p_after_id uuid default null)
returns table (media_id uuid, version_id uuid, original_name text, mime text, bytes integer, width integer, height integer)
language sql stable security definer set search_path = ''
as $$
  select m.id, v.id, v.original_name, v.mime, v.bytes, v.width, v.height from cms_private.media m
  cross join lateral (select * from cms_private.media_versions where media_id = m.id order by uploaded_at desc, id desc limit 1) v
  where m.area = p_area and public.cms_can_edit(p_area) and (p_after_id is null or m.id > p_after_id)
  order by m.id limit 50;
$$;

create function public.cms_get_draft_media(p_version_id uuid)
returns table (version_id uuid, mime text, bytes integer, sha256 text)
language sql stable security definer set search_path = ''
as $$
  select v.id, v.mime, v.bytes, v.sha256 from cms_private.media_versions v
    join cms_private.media m on m.id = v.media_id
  where v.id = p_version_id and public.cms_can_edit(m.area);
$$;

create function public.cms_get_public_media(p_version_id uuid)
returns table (version_id uuid, mime text, bytes integer, sha256 text)
language sql stable security definer set search_path = ''
as $$
  select v.id, v.mime, v.bytes, v.sha256 from cms_private.media_versions v
  where v.id = p_version_id and exists (
    select 1 from cms_private.revision_media r join cms_private.content c on c.published_revision_id = r.revision_id
    where r.version_id = v.id and c.archived_at is null
  );
$$;

revoke all on function cms_private.content_schema(public.cms_area), cms_private.allowed_content_url(text, text),
  cms_private.validate_content_fields(public.cms_area, jsonb, boolean), cms_private.attach_revision_media(),
  cms_private.media_object_matches(uuid, text, integer) from public, anon, authenticated, service_role;

revoke all on function public.cms_content_schema(public.cms_area), public.cms_authorize_upload(public.cms_area, uuid),
  public.cms_record_media_version(uuid, public.cms_area, uuid, uuid, text, text, integer, text, integer, integer),
  public.cms_list_media(public.cms_area, uuid), public.cms_get_draft_media(uuid), public.cms_get_public_media(uuid)
  from public, anon, authenticated, service_role;

grant execute on function public.cms_content_schema(public.cms_area), public.cms_authorize_upload(public.cms_area, uuid),
  public.cms_list_media(public.cms_area, uuid), public.cms_get_draft_media(uuid) to authenticated;

grant execute on function public.cms_get_public_media(uuid) to anon, authenticated;

grant execute on function
  public.cms_record_media_version(uuid, public.cms_area, uuid, uuid, text, text, integer, text, integer, integer)
  to service_role;
