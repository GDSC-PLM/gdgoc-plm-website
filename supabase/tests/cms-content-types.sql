-- Validate the fixed schemas and database grants in a local rollback transaction.
\set ON_ERROR_STOP on
begin;

create function pg_temp.invalid_fields(p_area public.cms_area, p_fields jsonb, p_field text, p_publish boolean default false)
returns void language plpgsql set search_path = ''
as $$
declare
  field_detail text;
begin
  begin
    perform cms_private.validate_content_fields(p_area, p_fields, p_publish);
  exception when invalid_parameter_value then
    get stacked diagnostics field_detail = pg_exception_detail;
    if field_detail is distinct from p_field then raise; end if;
    return;
  end;
  raise exception 'Validation accepted invalid field % in %', p_field, p_area;
end;
$$;

select cms_private.validate_content_fields(area::public.cms_area, fields::jsonb, true)
from (values
  ('events', '{"startsAt":"2026-12-11T18:30:00+08:00","endsAt":"2026-12-11T11:00Z","mode":"hybrid","venue":"Local fixture hall","description":"A local event","cover":{"versionId":"31000000-0000-4000-8000-000000000001","alt":"Event artwork"},"registrationUrl":"https://lu.ma/local-fixture"}'),
  ('blogs', '{"category":"project","body":"Project text","featured":true,"sortOrder":2,"tags":["Build"],"topics":["Frontend"],"statusLabel":"Ongoing","metaTitle":"Project SEO","metaDescription":"Description"}'),
  ('blogs', '{"category":"past-event","body":"Event recap"}'),
  ('blogs', '{"category":"initiative","body":"An initiative"}'),
  ('board', '{"role":"Community Lead","bio":"Public bio"}'),
  ('partners', '{"kind":"partner","description":"Partner description","websiteUrl":"https://partner.example.org/"}'),
  ('partners', '{"kind":"sponsor","description":"Sponsor description"}'),
  ('zines', '{"issueLabel":"Issue 1","releaseDate":"2026-12-12","description":"Zine description","download":{"versionId":"31000000-0000-4000-8000-000000000002"}}'),
  ('haribots', '{"description":"A Haribot profile"}'),
  ('faq', '{"answer":"A reviewed answer"}'),
  ('games', '{"description":"A directory listing","instructions":"Use the arrow keys","outboundUrl":"https://studio.itch.io/game"}')
) fixtures(area, fields);

select pg_temp.invalid_fields('board', '{"accountId":"31000000-0000-4000-8000-000000000001"}', 'accountId');
select pg_temp.invalid_fields('blogs', '{"category":"arbitrary"}', 'category');
select pg_temp.invalid_fields('blogs', '{"sortOrder":0.5}', 'sortOrder');
select pg_temp.invalid_fields('blogs', '{"tags":[1]}', 'tags');
select pg_temp.invalid_fields('zines', '{"releaseDate":"2026-02-30"}', 'releaseDate');
select pg_temp.invalid_fields('events', '{"startsAt":"2026-12-11T18:30"}', 'startsAt');
select pg_temp.invalid_fields('events', '{"startsAt":"2026-12-11T18:30:00+08:00","endsAt":"2026-12-11T10:29Z"}', 'endsAt');
select pg_temp.invalid_fields('events', '{"startsAt":"2026-12-11T18:30:00+08:00","mode":"hybrid","description":"An event","cover":{"versionId":"31000000-0000-4000-8000-000000000001","alt":"Art"},"registrationUrl":"https://forms.gle/local-fixture"}', 'venue', true);
select pg_temp.invalid_fields('events', '{"registrationUrl":"https://lu.ma.attacker.invalid/signup"}', 'registrationUrl');
select pg_temp.invalid_fields('events', '{"registrationUrl":"https://docs.google.com/document/lure"}', 'registrationUrl');
select pg_temp.invalid_fields('games', '{"outboundUrl":"https://studio.itch.io@attacker.invalid/game"}', 'outboundUrl');
select pg_temp.invalid_fields('haribots', '{"photo":{"versionId":"31000000-0000-4000-8000-000000000001"}}', 'photo');
select pg_temp.invalid_fields('faq', '{"answer":" "}', 'answer', true);

insert into cms_private.access (email, full_admin, areas, expires_at, user_id, accepted_at)
values ('cms-typed-events@example.invalid', false, '{events}', now(), '31000000-0000-4000-8000-000000000003', now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"31000000-0000-4000-8000-000000000003","app_metadata":{"provider":"google"},"amr":[{"method":"oauth"}]}';
select public.cms_authorize_upload('events', null);
select public.cms_create_content('events', '', null, '{"mode":"online"}');

do $$
begin
  if public.cms_content_schema('events') is null or public.cms_content_schema('zines') is not null then
    raise exception 'Typed descriptor scope failed';
  end if;
  begin
    perform public.cms_create_content('events', 'Unknown cover', 'unknown-cover',
      '{"cover":{"versionId":"31000000-0000-4000-8000-000000000001","alt":"Unavailable file"}}');
    raise exception 'Accepted an unknown media version';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.cms_authorize_upload('zines', null);
    raise exception 'Allowed upload into another content area';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
update cms_private.upload_rate
set attempts = 7, window_start = date_trunc('minute', clock_timestamp()) + interval '1 minute'
where actor_id = '31000000-0000-4000-8000-000000000003';

set local role authenticated;
select public.cms_authorize_upload('events', null);
do $$
begin
  begin
    perform public.cms_authorize_upload('events', null);
    raise exception 'Upload limit did not deny the next request';
  exception when sqlstate 'PT429' then null;
  end;
end;
$$;
reset role;

do $$
begin
  if has_function_privilege('authenticated',
    'public.cms_record_media_version(uuid,public.cms_area,uuid,uuid,text,text,integer,text,integer,integer)', 'execute')
    or has_function_privilege('anon', 'public.cms_get_draft_media(uuid)', 'execute')
    or not has_function_privilege('anon', 'public.cms_get_public_media(uuid)', 'execute') then
    raise exception 'Unexpected media grants';
  end if;
  raise notice 'Passed fixed schema, publication fields, upload rate, and media grant fixtures.';
end;
$$;

set constraints all immediate;
rollback;
