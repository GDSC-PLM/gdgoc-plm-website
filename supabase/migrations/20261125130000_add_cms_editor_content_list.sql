create function public.cms_list_editor_content(p_area public.cms_area, p_after_id uuid default null)
returns table (
  id uuid, title text, slug text, saved_at timestamptz,
  draft_revision_id uuid, published_revision_id uuid, archived_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select c.id, r.title, r.slug, r.saved_at, c.draft_revision_id, c.published_revision_id, c.archived_at
  from cms_private.content c
  join cms_private.revisions r on r.id = c.draft_revision_id and r.content_id = c.id
  where c.area = p_area and public.cms_can_edit(c.area)
    and (p_after_id is null or c.id > p_after_id)
  order by c.id limit 200;
$$;

revoke all on function public.cms_list_editor_content(public.cms_area, uuid)
  from public, anon, authenticated, service_role;

grant execute on function public.cms_list_editor_content(public.cms_area, uuid) to authenticated;
