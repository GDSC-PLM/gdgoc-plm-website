-- Run against the local database as postgres. Every fixture is rolled back.
\set ON_ERROR_STOP on
begin;

create function pg_temp.assert_ok(ok boolean, test_name text)
returns void language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'Failed: %', test_name; end if;
  raise notice 'Pass: %', test_name;
end;
$$;

insert into auth.users (id, aud, role, email, email_confirmed_at)
values
  ('11000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'cms-owner@example.invalid', now()),
  ('11000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'cms-editor@example.invalid', now()),
  ('11000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'cms-expired@example.invalid', now()),
  ('11000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'cms-unknown@example.invalid', now()),
  ('11000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'cms-replacement@example.invalid', now()),
  ('11000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'cms-unverified@example.invalid', now());

insert into auth.identities (user_id, provider, provider_id, identity_data)
select u.id, 'google', u.id::text, jsonb_build_object(
  'sub', u.id, 'email', u.email, 'email_verified', u.email <> 'cms-unverified@example.invalid'
)
from auth.users u where u.id::text like '11000000-0000-4000-8000-00000000000%';

select cms_private.invite_operator_admin(' CMS-OWNER@example.invalid ');
select cms_private.invite_operator_admin('cms-expired@example.invalid');
update cms_private.access set expires_at = now() - interval '1 second'
where email = 'cms-expired@example.invalid';

select pg_temp.assert_ok(not has_schema_privilege('anon', 'cms_private', 'usage')
  and not has_schema_privilege('authenticated', 'cms_private', 'usage')
  and not has_function_privilege('anon', 'public.cms_my_access()', 'execute')
  and not has_function_privilege('authenticated', 'public.cms_limit_sign_in()', 'execute')
  and not has_function_privilege('authenticated', 'public.cms_before_user_created(jsonb)', 'execute')
  and has_function_privilege('supabase_auth_admin', 'public.cms_before_user_created(jsonb)', 'execute'),
  'direct anonymous and authenticated grants protect private operations');

-- The local postgres operator can test the hook it owns without assuming the Auth service role.
select pg_temp.assert_ok(public.cms_before_user_created(
  '{"user":{"email":"CMS-OWNER@example.invalid","app_metadata":{"provider":"google"}}}'
) = '{}', 'admission accepts an exact active Google invitation');
select pg_temp.assert_ok(public.cms_before_user_created(
  '{"user":{"email":"cms-owner@example.invalid","app_metadata":{"provider":"email"}}}'
) ? 'error', 'admission rejects password signup, even for an invited address');
select pg_temp.assert_ok(public.cms_before_user_created(
  '{"user":{"email":"cms-expired@example.invalid","app_metadata":{"provider":"google"}}}'
) ? 'error', 'admission rejects an expired Google invitation');
select pg_temp.assert_ok(public.cms_before_user_created(
  '{"user":{"email":"cms-unknown@example.invalid","app_metadata":{"provider":"google"}}}'
) ? 'error', 'admission rejects an unapproved Google address');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000004","email":"cms-unknown@example.invalid","app_metadata":{"provider":"google"},"amr":[{"method":"oauth"}]}';
select pg_temp.assert_ok(not public.cms_accept_invitation()
  and not exists (select 1 from public.cms_my_access()), 'a preexisting unapproved identity cannot bind or read');

set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000003","email":"cms-expired@example.invalid","app_metadata":{"provider":"google"},"amr":[{"method":"oauth"}]}';
select pg_temp.assert_ok(not public.cms_accept_invitation(), 'callback cannot bind an expired invitation');

set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000001","email":"cms-owner@example.invalid","app_metadata":{"provider":"google"},"amr":[{"method":"password"}]}';
select pg_temp.assert_ok(not public.cms_accept_invitation(), 'a password session cannot activate Google administrator access');

set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000001","email":"cms-owner@example.invalid","app_metadata":{"provider":"google"},"amr":[{"method":"oauth"}]}';
select pg_temp.assert_ok(public.cms_accept_invitation(), 'trusted operator invitation activates');
select pg_temp.assert_ok(public.cms_can_publish() and public.cms_can_edit('settings'),
  'full administrators can publish and edit settings');
do $$
begin
  begin
    perform public.cms_manage_access('revoke', 'cms-owner@example.invalid');
    raise exception 'Last full administrator could be revoked';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.cms_manage_access('update_permissions', 'cms-owner@example.invalid', false, '{events}');
    raise exception 'Last full administrator could be demoted';
  exception when invalid_parameter_value then null;
  end;
end;
$$;

select public.cms_manage_access('invite', 'cms-editor@example.invalid', false, '{events}', 1);
select public.cms_manage_access('invite', 'cms-replacement@example.invalid', true);
select public.cms_manage_access('cancel_invitation', 'cms-replacement@example.invalid');
select public.cms_manage_access('invite', 'cms-unverified@example.invalid', true);

set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000006","email":"cms-unverified@example.invalid","app_metadata":{"provider":"google"},"amr":[{"method":"oauth"}]}';
select pg_temp.assert_ok(not public.cms_accept_invitation(), 'an unverified Google email cannot activate access');

set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000002","email":"cms-editor@example.invalid","app_metadata":{"provider":"google"},"amr":[{"method":"oauth"}]}';
select pg_temp.assert_ok(public.cms_accept_invitation(), 'scoped contributor invitation activates');
select pg_temp.assert_ok(public.cms_can_edit('events') and not public.cms_can_edit('blogs')
  and not public.cms_can_edit('settings') and not public.cms_can_publish(),
  'contributor edits the assigned area and cannot publish or edit settings');
do $$
begin
  begin
    perform public.cms_list_access();
    raise exception 'Contributor could read access records';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.cms_manage_access('invite', 'unauthorized@example.invalid', true);
    raise exception 'Contributor could grant access';
  exception when insufficient_privilege then null;
  end;
end;
$$;

set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000005","email":"cms-replacement@example.invalid","app_metadata":{"provider":"google"},"amr":[{"method":"oauth"}]}';
select pg_temp.assert_ok(not public.cms_accept_invitation(), 'cancelled invitation cannot activate');

set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000001","email":"cms-owner@example.invalid","app_metadata":{"provider":"google"},"amr":[{"method":"oauth"}]}';
select public.cms_manage_access('invite', 'cms-replacement@example.invalid', true);
select public.cms_manage_access('update_permissions', 'cms-editor@example.invalid', false, '{blogs}');

set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000002","email":"cms-editor@example.invalid","app_metadata":{"provider":"google"},"amr":[{"method":"oauth"}]}';
select pg_temp.assert_ok(not public.cms_can_edit('events') and public.cms_can_edit('blogs'),
  'the same contributor claims see changed scopes immediately');

set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000001","email":"cms-owner@example.invalid","app_metadata":{"provider":"google"},"amr":[{"method":"oauth"}]}';
select public.cms_manage_access('revoke', 'cms-editor@example.invalid');

set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000002","email":"cms-editor@example.invalid","app_metadata":{"provider":"google"},"amr":[{"method":"oauth"}]}';
select pg_temp.assert_ok(not public.cms_accept_invitation() and not public.cms_can_edit('blogs')
  and not exists (select 1 from public.cms_my_access()), 'the same contributor claims lose access after revocation');

set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000005","email":"cms-replacement@example.invalid","app_metadata":{"provider":"google"},"amr":[{"method":"oauth"}]}';
select pg_temp.assert_ok(public.cms_accept_invitation(), 'replacement full administrator activates after reissue');
select pg_temp.assert_ok(public.cms_can_publish() and (select count(*) from public.cms_list_access()) >= 4,
  'replacement has full access before handover');
select public.cms_manage_access('revoke', 'cms-owner@example.invalid');

set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000001","email":"cms-owner@example.invalid","app_metadata":{"provider":"google"},"amr":[{"method":"oauth"}]}';
select pg_temp.assert_ok(not public.cms_can_publish(), 'outgoing administrator claims lose publish access after handover');
reset role;

select pg_temp.assert_ok(exists (
  select 1 from cms_private.audit where action = 'revoke'
    and target_email = 'cms-owner@example.invalid'
    and actor_id = '11000000-0000-4000-8000-000000000005' and occurred_at is not null
), 'handover revocation audit records the actor and time');
select pg_temp.assert_ok(exists (
  select 1 from cms_private.audit where action = 'operator_invite'
    and target_email = 'cms-owner@example.invalid' and operator_name = session_user
), 'bootstrap records the database operator');
select pg_temp.assert_ok((select count(*) from cms_private.audit
  where action = 'accept_invitation' and target_email = 'cms-editor@example.invalid') = 1,
  'activation emits one audit entry');

delete from cms_private.sign_in_rate;
set local role service_role;
do $$
begin
  for attempt in 1..30 loop
    if not public.cms_limit_sign_in() then raise exception 'Attempt % was blocked early', attempt; end if;
  end loop;
end;
$$;
select pg_temp.assert_ok(not public.cms_limit_sign_in(), 'sign-in budget closes after 30 starts');
reset role;

rollback;
