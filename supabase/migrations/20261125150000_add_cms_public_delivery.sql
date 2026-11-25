create unique index cms_one_active_settings on cms_private.content (area)
  where area = 'settings' and archived_at is null;

-- Retain previously published slugs even while their owner is unpublished.
create table cms_private.public_slugs (
  area public.cms_area not null,
  slug text not null,
  content_id uuid not null references cms_private.content(id),
  primary key (area, slug)
);
alter table cms_private.public_slugs enable row level security;
revoke all on cms_private.public_slugs from public, anon, authenticated, service_role;

insert into cms_private.public_slugs
select distinct on (c.area, r.slug) c.area, r.slug, c.id
from cms_private.content_audit a
join cms_private.content c on c.id = a.content_id
join cms_private.revisions r on r.id = a.revision_id
where a.action = 'publish' and c.area <> 'settings' and r.slug is not null
order by c.area, r.slug, (c.published_slug is not distinct from r.slug) desc, a.id desc;

create function cms_private.retain_public_slug() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.area <> 'settings' and new.published_slug is not null then
    insert into cms_private.public_slugs as s values (new.area, new.published_slug, new.id)
    on conflict (area, slug) do update set content_id = excluded.content_id
      where s.content_id = excluded.content_id;
    if not found then
      raise unique_violation using message = 'This slug is reserved by a previously published record.';
    end if;
  end if;
  return null;
end;
$$;
create trigger cms_retain_public_slug after update of published_slug on cms_private.content
  for each row execute function cms_private.retain_public_slug();

alter function cms_private.content_schema(public.cms_area) rename to content_schema_without_settings;
create function cms_private.content_schema(p_area public.cms_area)
returns jsonb language sql immutable set search_path = '' as $$
  select case when p_area = 'settings' then '{
    "headlineFirst":{"type":"line","max":50},
    "headlineSecond":{"type":"line","max":70},
    "homeDescription":{"type":"line","max":200},
    "homeStatus":{"type":"line","max":45},
    "navigation":{"type":"rows"},
    "footerLinks":{"type":"rows"},
    "socials":{"type":"rows"},
    "contactEmail":{"type":"line","max":254},
    "contactText":{"type":"markdown","max":4000},
    "homeFeatured":{"type":"rows"}
  }'::jsonb else cms_private.content_schema_without_settings(p_area) end;
$$;
-- Rebind the SQL wrapper to the extended schema.
create or replace function public.cms_content_schema(p_area public.cms_area)
returns jsonb language sql stable security definer set search_path = '' as $$
  select cms_private.content_schema(p_area) where public.cms_can_edit(p_area);
$$;

alter function cms_private.validate_content_fields(public.cms_area,jsonb,boolean) rename to validate_non_settings;
create function cms_private.validate_content_fields(p_area public.cms_area, p_fields jsonb, p_publish boolean)
returns void language plpgsql set search_path = '' as $$
declare
  field text;
  value jsonb;
  row_value jsonb;
  rule jsonb;
  href text;
  label text;
  route_pattern constant text := '^/($|about$|events$|projects$|blogs$|team$|partners$|contact$|zines$|haribots$|faq$|games$)';
  seen text[];
begin
  if p_area <> 'settings' then
    perform cms_private.validate_non_settings(p_area, p_fields, p_publish);
    return;
  end if;
  if jsonb_typeof(p_fields) is distinct from 'object' then
    raise exception 'Invalid site settings' using errcode = '22023';
  end if;
  for field, value in select e.key, e.value from jsonb_each(p_fields) e loop
    rule := cms_private.content_schema(p_area) -> field;
    if rule is null then
      raise exception 'Unknown settings field' using errcode = '22023', detail = field;
    elsif rule ->> 'type' <> 'rows' then
      label := value #>> '{}';
      if jsonb_typeof(value) <> 'string' or char_length(label) > (rule ->> 'max')::int or
        (rule ->> 'type' = 'line' and label ~ '[[:cntrl:]]') or
        (field = 'contactEmail' and label !~ '^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$') then
        raise exception 'Invalid settings value' using errcode = '22023', detail = field;
      end if;
      continue;
    end if;

    if jsonb_typeof(value) <> 'array' then
      raise exception 'Enter a list of settings rows' using errcode = '22023', detail = field;
    end if;
    if jsonb_array_length(value) > (case field when 'homeFeatured' then 6 when 'socials' then 4 else 12 end) then
      raise exception 'Too many settings rows' using errcode = '22023', detail = field;
    end if;
    seen := '{}';
    for row_value in select jsonb_array_elements(value) loop
      if jsonb_typeof(row_value) <> 'array' then
        raise exception 'Invalid settings row' using errcode = '22023', detail = field;
      end if;
      if exists (select from jsonb_array_elements(row_value) x where jsonb_typeof(x) <> 'string') then
        raise exception 'Invalid settings row' using errcode = '22023', detail = field;
      end if;
      label := row_value ->> 0;
      href := row_value ->> 1;
      if not coalesce(case field
        when 'homeFeatured' then jsonb_array_length(row_value) = 1
          and label ~ '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$'
        when 'navigation' then jsonb_array_length(row_value) = 3 and href ~ route_pattern
          and row_value ->> 2 in ('show','hide')
        when 'footerLinks' then jsonb_array_length(row_value) = 2
          and (href ~ route_pattern or cms_private.allowed_content_url(href, 'https'))
        when 'socials' then jsonb_array_length(row_value) = 2 and cms_private.allowed_content_url(href, 'https')
          and href ~ case label
            when 'facebook' then '^https://www\.facebook\.com/[^/?#]+'
            when 'instagram' then '^https://www\.instagram\.com/[^/?#]+'
            when 'tiktok' then '^https://www\.tiktok\.com/@[^/?#]+'
            when 'community' then '^https://gdg\.community\.dev/[^/?#]+'
          end
      end, false) or char_length(label) not between 1 and 70 or label <> btrim(label) or label ~ '[[:cntrl:]|]' then
        raise exception 'Invalid settings row' using errcode = '22023', detail = field;
      end if;
      if field in ('navigation','footerLinks') then label := href; end if;
      if label = any(seen) then
        raise exception 'Duplicate settings row' using errcode = '22023', detail = field;
      end if;
      seen := array_append(seen, label);
      if field = 'homeFeatured' and not exists (
        select from cms_private.content c where c.id::text = label and c.area <> 'settings'
      ) then
        raise exception 'Featured content ID does not exist' using errcode = '22023', detail = field;
      end if;
    end loop;
  end loop;
end;
$$;

-- An allowlist for the article renderer and its content-specific metadata.
create view cms_private.live_content as
select c.id, c.area, r.id as revision_id, r.title, r.slug, r.saved_at,
  case c.area when 'board' then 'team' when 'blogs' then
    case when r.fields ->> 'category' = 'project' then 'projects' else 'blogs' end
    else c.area::text end as collection,
  r.fields
from cms_private.content c join cms_private.revisions r on r.id = c.published_revision_id
where c.archived_at is null;

create function public.cms_public_lookup(p_collection text, p_slug text)
returns table(id uuid, revision_id uuid, collection text, slug text)
language sql stable security definer set search_path = '' as $$
  select l.id, l.revision_id, l.collection, l.slug
  from cms_private.public_slugs s join cms_private.live_content l on l.id = s.content_id
  where s.slug = p_slug and s.area::text = case p_collection when 'team' then 'board'
    when 'projects' then 'blogs' else p_collection end
    and l.area <> 'settings';
$$;

create function public.cms_public_article(p_revision uuid)
returns table(title text, slug text, fields jsonb) language sql stable security definer set search_path = '' as $$
  select l.title, l.slug, coalesce((select jsonb_object_agg(key,value) from jsonb_each(l.fields)
    where key = any(array['category','statusLabel','kind','role','issueLabel','startsAt','endsAt',
      'mode','venue','releaseDate','cover','photo','logo','download','body','bio','answer',
      'description','registrationUrl','outboundUrl','websiteUrl','instructions','tags','topics',
      'metaTitle','metaDescription','socialImage'])), '{}')
  from cms_private.live_content l where l.revision_id = p_revision and l.area <> 'settings';
$$;

create function public.cms_public_list(p_collection text, p_filter text default '', p_sort text default '',
  p_page integer default 1)
returns table(id uuid, title text, slug text, collection text, category text, summary text, image jsonb,
  featured boolean, event_date text) language sql stable security definer set search_path = '' as $$
  select l.id, l.title, l.slug, l.collection, l.fields->>'category',
    left(coalesce(l.fields->>'metaDescription', l.fields->>'description', l.fields->>'body',
      l.fields->>'bio', l.fields->>'answer'), 220),
    coalesce(l.fields->'cover', l.fields->'photo', l.fields->'logo'),
    coalesce(l.fields->'featured' = 'true', false), l.fields->>'startsAt'
  from cms_private.live_content l
  where l.collection = p_collection and l.area <> 'settings'
    and case p_collection
      when 'events' then case p_filter
        when 'upcoming' then coalesce((l.fields->>'endsAt')::timestamptz,(l.fields->>'startsAt')::timestamptz) >= now()
        when 'past' then coalesce((l.fields->>'endsAt')::timestamptz,(l.fields->>'startsAt')::timestamptz) < now()
        else true end
      when 'blogs' then p_filter = '' or l.fields->>'category' = p_filter
      when 'partners' then p_filter = '' or l.fields->>'kind' = p_filter
      else true end
  order by coalesce(l.fields->'featured' = 'true', false) desc, (l.fields->>'sortOrder')::int nulls last,
    case when p_collection = 'events' and p_sort <> 'latest' then (l.fields->>'startsAt')::timestamptz end asc,
    case when p_collection = 'events' and p_sort = 'latest' then (l.fields->>'startsAt')::timestamptz end desc,
    case when p_collection = 'zines' then l.fields->>'releaseDate' end desc,
    case when p_collection in ('blogs','projects') then l.saved_at end desc, lower(l.title), l.id
  limit 13 offset (greatest(1, least(coalesce(p_page,1),100))-1)*12;
$$;

create function public.cms_public_featured(p_ids uuid[])
returns table(id uuid, title text, slug text, collection text)
language sql stable security definer set search_path = '' as $$
  select l.id, l.title, l.slug, l.collection from unnest(p_ids[1:6]) with ordinality as picks(id, position)
    join cms_private.live_content l on l.id = picks.id
    where l.area <> 'settings' order by picks.position;
$$;

create function public.cms_public_settings() returns jsonb
language sql stable security definer set search_path = '' as $$
  select l.fields from cms_private.live_content l where l.area = 'settings';
$$;

create function public.cms_public_sitemap(p_after uuid default null)
returns table(id uuid, collection text, slug text, saved_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select l.id, l.collection, l.slug, l.saved_at from cms_private.live_content l
  where l.area <> 'settings' and (p_after is null or l.id > p_after)
  order by l.id limit 500;
$$;

revoke all on cms_private.live_content from public, anon, authenticated, service_role;
revoke all on function cms_private.retain_public_slug(), cms_private.content_schema(public.cms_area),
  cms_private.validate_content_fields(public.cms_area,jsonb,boolean),
  public.cms_public_lookup(text,text), public.cms_public_article(uuid), public.cms_public_list(text,text,text,integer),
  public.cms_public_featured(uuid[]), public.cms_public_settings(), public.cms_public_sitemap(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.cms_public_lookup(text,text), public.cms_public_article(uuid),
  public.cms_public_list(text,text,text,integer), public.cms_public_featured(uuid[]),
  public.cms_public_settings(), public.cms_public_sitemap(uuid) to anon, authenticated;
