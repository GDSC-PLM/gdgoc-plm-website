-- Local Supabase only. Accounts, content and test triggers roll back together.
\set ON_ERROR_STOP on
begin;

create function pg_temp.assert_ok(ok boolean, label text)
returns void language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'Failed: %', label; end if;
  raise notice 'Pass: %', label;
end;
$$;

create function pg_temp.assert_sqlstate(statement text, expected text, label text)
returns void language plpgsql as $$
begin
  begin
    execute statement;
  exception when others then
    if sqlstate <> expected then raise; end if;
    raise notice 'Pass: %', label;
    return;
  end;
  raise exception 'Failed: %, expected SQLSTATE %', label, expected;
end;
$$;

insert into cms_private.access (email, full_admin, areas, expires_at, user_id, accepted_at)
values
  ('cms-revisions-admin@example.invalid', true, '{}', now(), '21000000-0000-4000-8000-000000000001', now()),
  ('cms-revisions-editor@example.invalid', false, '{blogs}', now(), '21000000-0000-4000-8000-000000000002', now());

select pg_temp.assert_ok(not has_schema_privilege('authenticated', 'cms_private', 'usage')
  and not has_table_privilege('authenticated', 'cms_private.revisions', 'select,update')
  and not has_function_privilege('anon', 'public.cms_get_revision(uuid,uuid)', 'execute')
  and not has_function_privilege('service_role',
    'cms_private.apply_publication(uuid,uuid,uuid,public.cms_publication_action,uuid,uuid,boolean)', 'execute')
  and not has_function_privilege('authenticated',
    'cms_private.apply_publication(uuid,uuid,uuid,public.cms_publication_action,uuid,uuid,boolean)', 'execute'),
  'only the narrow RPCs are exposed and the pinned publisher is private');

set local role authenticated;
set local request.jwt.claims = '{"sub":"21000000-0000-4000-8000-000000000001","app_metadata":{"provider":"google"},"amr":[{"method":"oauth"}]}';
select public.cms_create_content('events', 'Other area', 'other', '{}') as blog_id \gset
select draft_revision_id as blog_revision from public.cms_get_content(:'blog_id') \gset

set local request.jwt.claims = '{"sub":"21000000-0000-4000-8000-000000000002","app_metadata":{"provider":"google"},"amr":[{"method":"oauth"}]}';
select public.cms_create_content('blogs', 'First headline', 'stage-two-first', '{"category":"project","body":"Published body"}') as item_id \gset
select draft_revision_id as first_revision from public.cms_get_content(:'item_id') \gset
select public.cms_create_content('blogs', '', null, '{"body":"Incomplete work"}') as blank_id \gset
select draft_revision_id as blank_revision from public.cms_get_content(:'blank_id') \gset

select pg_temp.assert_ok(not exists (select 1 from public.cms_get_content(:'blog_id'))
  and not exists (select 1 from public.cms_get_revision(:'blog_id', :'blog_revision'))
  and not exists (select 1 from public.cms_revision_history(:'blog_id'))
  and not exists (select 1 from public.cms_content_activity(:'blog_id')),
  'contributor cannot read other area content, revisions, or audit');
select pg_temp.assert_sqlstate(format('select public.cms_write_draft(%L,%L,%L,%L,%L)',
  :'blog_id', :'blog_revision', 'Unauthorized edit', 'other', '{}'), 'PT404',
  'contributor cannot write outside their area');
select pg_temp.assert_sqlstate($q$select public.cms_create_content('events','Unauthorized create',null,'{}')$q$,
  '42501', 'contributor cannot create outside their area');
select pg_temp.assert_sqlstate(format('select public.cms_apply_publication(gen_random_uuid(),%L,%L,%L,null)',
  :'item_id', 'publish', :'first_revision'), '42501', 'contributor cannot publish in their own area');
select pg_temp.assert_sqlstate($q$select public.cms_create_content('blogs','Invalid draft','bad/slug','{}')$q$,
  '23514', 'database rejects invalid slugs');

reset role;
set local role anon;
select pg_temp.assert_ok(not exists (select 1 from public.cms_read_published(:'item_id')),
  'anonymous readers cannot see a never published record');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"21000000-0000-4000-8000-000000000001","app_metadata":{"provider":"google"},"amr":[{"method":"oauth"}]}';
select pg_temp.assert_sqlstate(format('select public.cms_apply_publication(gen_random_uuid(),%L,%L,%L,null)',
  :'blank_id', 'publish', :'blank_revision'), '22023',
  'an incomplete draft saves but publication rejects missing required fields');
select gen_random_uuid() as first_operation \gset
select pg_temp.assert_ok((select previous_slug is null and current_slug = 'stage-two-first'
    and published_revision_id = :'first_revision' from public.cms_apply_publication(
      :'first_operation', :'item_id', 'publish', :'first_revision', null)),
  'publication returns its cache effect and explicitly approved revision');

set local request.jwt.claims = '{"sub":"21000000-0000-4000-8000-000000000002","app_metadata":{"provider":"google"},"amr":[{"method":"oauth"}]}';
select public.cms_write_draft(:'item_id', :'first_revision', 'Private second headline', 'stage-two-second',
  '{"category":"initiative","body":"Private body","tags":["saved together"]}') as second_revision \gset
select pg_temp.assert_sqlstate(format('select public.cms_write_draft(%L,%L,%L,null,%L)',
  :'item_id', :'first_revision', 'Stale edit', '{}'), 'PT409', 'stale edit cannot overwrite a newer draft');
select pg_temp.assert_sqlstate(format('select public.cms_write_draft(%L,%L,p_source_revision_id => %L)',
  :'item_id', :'second_revision', :'blog_revision'), 'PT404', 'restore rejects revisions from another record');
select public.cms_write_draft(:'item_id', :'second_revision', p_source_revision_id => :'first_revision') as restored_revision \gset
select pg_temp.assert_ok((select draft_revision_id = :'restored_revision' and published_revision_id = :'first_revision'
    from public.cms_get_content(:'item_id')) and
  (select version = 3 and slug = 'stage-two-first' and fields = '{"category":"project","body":"Published body"}'
    and restored_from_revision_id = :'first_revision' and saved_by = '21000000-0000-4000-8000-000000000002'
    and saved_at is not null from public.cms_get_revision(:'item_id', :'restored_revision')),
  'restore appends a complete revision, records provenance, and preserves the live pointer');
select pg_temp.assert_ok((select count(*) = 2 from public.cms_revision_history(:'item_id', 3)),
  'revision history pages through retained revisions');

reset role;
set local role anon;
select pg_temp.assert_ok((select to_jsonb(p) = jsonb_build_object('id', :'item_id'::uuid, 'area', 'blogs',
    'title', 'First headline', 'slug', 'stage-two-first') from public.cms_read_published(:'item_id') p),
  'public projection excludes newer drafts, raw snapshot fields, and account IDs');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"21000000-0000-4000-8000-000000000001","app_metadata":{"provider":"google"},"amr":[{"method":"oauth"}]}';
select pg_temp.assert_sqlstate(format('select public.cms_apply_publication(gen_random_uuid(),%L,%L,%L,%L)',
  :'item_id', 'publish', :'second_revision', :'first_revision'), 'PT409', 'manual publication rejects an outdated draft');
reset role;

select gen_random_uuid() as pinned_operation \gset
select pg_temp.assert_ok((select previous_slug = 'stage-two-first' and current_slug = 'stage-two-second'
    and published_revision_id = :'second_revision'
    from cms_private.apply_publication('21000000-0000-4000-8000-000000000001',
      :'pinned_operation', :'item_id', 'publish', :'second_revision', :'first_revision', true)),
  'trusted pinned approval publishes the exact earlier revision and reports the old and new slug');

set local role authenticated;
set local request.jwt.claims = '{"sub":"21000000-0000-4000-8000-000000000001","app_metadata":{"provider":"google"},"amr":[{"method":"oauth"}]}';
select pg_temp.assert_ok((select draft_revision_id = :'restored_revision' and published_revision_id = :'second_revision'
  from public.cms_get_content(:'item_id')), 'pinned publication preserves the more recent draft');
select pg_temp.assert_sqlstate(format('select public.cms_apply_publication(gen_random_uuid(),%L,%L,null,%L)',
  :'item_id', 'unpublish', :'first_revision'), 'PT409', 'unpublish rejects a stale live pointer');
select pg_temp.assert_ok((select current_slug is null and previous_slug = 'stage-two-second'
    and published_revision_id is null
    from public.cms_apply_publication(gen_random_uuid(), :'item_id', 'unpublish', null, :'second_revision')),
  'unpublish clears live content and returns the slug to invalidate');

reset role;
set local role anon;
select pg_temp.assert_ok(not exists (select 1 from public.cms_read_published(:'item_id')),
  'unpublished records disappear for anonymous readers');
reset role;

select pg_temp.assert_ok((select published_revision_id = :'second_revision'
    from cms_private.apply_publication('21000000-0000-4000-8000-000000000001',
      :'pinned_operation', :'item_id', 'publish', :'second_revision', :'first_revision', true))
    and (select published_revision_id is null from cms_private.content where id = :'item_id')
    and (select count(*) = 1 from cms_private.content_audit where operation_id = :'pinned_operation'),
  'replaying a successful operation preserves its effect without republishing or writing duplicate audit');
select pg_temp.assert_sqlstate(format(
  'select cms_private.apply_publication(%L,%L,%L,%L,%L,null,true)',
  '21000000-0000-4000-8000-000000000001', :'pinned_operation', :'item_id', 'publish', :'restored_revision'),
  'PT409', 'operation ID cannot be reused for a different approval');

-- Force the final audit insert to fail to prove the pointer update rolls back.
create function pg_temp.reject_publication_audit() returns trigger language plpgsql as $$
begin
  raise exception 'Fixture audit failure' using errcode = 'P7001';
end;
$$;
create trigger stage_two_reject_audit before insert on cms_private.content_audit
for each row when (new.operation_id = '21000000-0000-4000-8000-000000000100')
execute function pg_temp.reject_publication_audit();

set local role authenticated;
set local request.jwt.claims = '{"sub":"21000000-0000-4000-8000-000000000001","app_metadata":{"provider":"google"},"amr":[{"method":"oauth"}]}';
select pg_temp.assert_sqlstate(format('select public.cms_apply_publication(%L,%L,%L,%L,null)',
  '21000000-0000-4000-8000-000000000100', :'item_id', 'publish', :'restored_revision'),
  'P7001', 'a failed audit insert aborts publication');
select pg_temp.assert_ok((select published_revision_id is null from public.cms_get_content(:'item_id')),
  'the failed publication leaves the live pointer untouched');

select public.cms_apply_publication(gen_random_uuid(), :'item_id', 'publish', :'restored_revision', null);
select public.cms_apply_publication(gen_random_uuid(), :'item_id', 'archive', :'restored_revision', :'restored_revision');
select pg_temp.assert_sqlstate(format('select public.cms_write_draft(%L,%L,%L,null,%L)',
  :'item_id', :'restored_revision', 'Archived edit', '{}'), 'PT409', 'archived records cannot be edited');
select pg_temp.assert_ok((select archived_at is not null and draft_revision_id = :'restored_revision'
    and published_revision_id is null from public.cms_get_content(:'item_id'))
    and (select count(*) = 3 from public.cms_revision_history(:'item_id'))
    and (select count(*) = 8 and bool_and(occurred_at is not null) from public.cms_content_activity(:'item_id'))
    and exists (select 1 from public.cms_content_activity(:'item_id') where action = 'archive'
      and actor_id = '21000000-0000-4000-8000-000000000001' and previous_published_revision_id = :'restored_revision'),
  'archive preserves complete revision history and attributable publication activity');

reset role;
set local role anon;
select pg_temp.assert_ok(not exists (select 1 from public.cms_read_published(:'item_id')),
  'archived records disappear for anonymous readers');
reset role;

select pg_temp.assert_sqlstate(format('update cms_private.revisions set title = %L where id = %L',
  'Rewrite history', :'first_revision'), '55000', 'revision snapshots reject direct updates');
select pg_temp.assert_sqlstate(format('delete from cms_private.content_audit where content_id = %L',
  :'item_id'), '55000', 'audit history is append only');
update cms_private.mutation_rate
set mutations = 59, window_start = date_trunc('minute', clock_timestamp()) + interval '1 minute'
where actor_id = '21000000-0000-4000-8000-000000000002';

set local role authenticated;
set local request.jwt.claims = '{"sub":"21000000-0000-4000-8000-000000000002","app_metadata":{"provider":"google"},"amr":[{"method":"oauth"}]}';
select public.cms_create_content('blogs', '', null, '{}');
select pg_temp.assert_sqlstate($q$select public.cms_create_content('blogs','Over budget',null,'{}')$q$,
  'PT429', 'content mutation budget rejects the 61st write');

reset role;
set constraints all immediate;
rollback;
