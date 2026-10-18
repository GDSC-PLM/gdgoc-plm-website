-- The hosted project may have this automatic-RLS helper; fresh databases may not.
-- Keep its DDL trigger and owner/service-role grants intact.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;
