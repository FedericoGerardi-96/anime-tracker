-- Custom lists only. Existing rows and new lists remain private by default.
-- Review existing views/SECURITY DEFINER RPCs using lists before deployment.
begin;

alter table public.lists
  add column visibility text not null default 'private',
  add column share_slug text,
  add constraint lists_visibility_check check (visibility in ('private', 'link', 'public')),
  add constraint lists_share_slug_check check (
    (visibility = 'private' and share_slug is null)
    or (visibility in ('link', 'public') and share_slug is not null and share_slug ~ '^[0-9a-f]{32}$')
  ),
  add constraint lists_share_slug_key unique (share_slug);

create index lists_public_profile_idx on public.lists (user_id, created_at desc, id)
  where visibility = 'public';
create index if not exists list_media_list_id_idx on public.list_media (list_id);

-- A capability token, unrelated to the list ID/name. Clients cannot choose it.
-- Returning to private revokes the token. Sharing again creates a new URL.
create function public.manage_list_share_slug() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.visibility = 'private' then
    new.share_slug := null;
  elsif tg_op = 'INSERT' then
    new.share_slug := replace(pg_catalog.gen_random_uuid()::text, '-', '');
  elsif old.share_slug is null then
    new.share_slug := replace(pg_catalog.gen_random_uuid()::text, '-', '');
  else
    new.share_slug := old.share_slug;
  end if;
  return new;
end;
$$;
revoke all on function public.manage_list_share_slug() from public, anon, authenticated;
create trigger manage_list_share_slug before insert or update of visibility, share_slug
  on public.lists for each row execute function public.manage_list_share_slug();

alter table public.lists enable row level security;
alter table public.list_media enable row level security;

-- Restrictive guards prevent an old permissive policy from widening access.
-- Existing restrictive policies are intentionally retained; audit them before deployment.
create policy lists_visibility_read_guard on public.lists as restrictive for select to anon, authenticated
  using (user_id = (select auth.uid()) or visibility = 'public');
create policy lists_visibility_read on public.lists for select to anon, authenticated
  using (user_id = (select auth.uid()) or visibility = 'public');
create policy lists_owner_insert_guard on public.lists as restrictive for insert to anon, authenticated
  with check (user_id = (select auth.uid()));
create policy lists_owner_insert on public.lists for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy lists_owner_update_guard on public.lists as restrictive for update to anon, authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy lists_owner_update on public.lists for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy lists_owner_delete_guard on public.lists as restrictive for delete to anon, authenticated
  using (user_id = (select auth.uid()));
create policy lists_owner_delete on public.lists for delete to authenticated
  using (user_id = (select auth.uid()));

create policy list_media_visibility_read_guard on public.list_media as restrictive for select to anon, authenticated
  using (exists (select 1 from public.lists l where l.id = list_id and (l.user_id = (select auth.uid()) or l.visibility = 'public')));
create policy list_media_visibility_read on public.list_media for select to anon, authenticated
  using (exists (select 1 from public.lists l where l.id = list_id and (l.user_id = (select auth.uid()) or l.visibility = 'public')));
create policy list_media_owner_insert_guard on public.list_media as restrictive for insert to anon, authenticated
  with check (exists (select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid())));
create policy list_media_owner_insert on public.list_media for insert to authenticated
  with check (exists (select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid())));
create policy list_media_owner_update_guard on public.list_media as restrictive for update to anon, authenticated
  using (exists (select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid())))
  with check (exists (select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid())));
create policy list_media_owner_update on public.list_media for update to authenticated
  using (exists (select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid())))
  with check (exists (select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid())));
create policy list_media_owner_delete_guard on public.list_media as restrictive for delete to anon, authenticated
  using (exists (select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid())));
create policy list_media_owner_delete on public.list_media for delete to authenticated
  using (exists (select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid())));

-- TRUNCATE bypasses RLS. Ordinary application roles only need CRUD.
revoke all on public.lists, public.list_media from public, anon, authenticated;
grant select on public.lists, public.list_media to anon;
grant select, insert, update, delete on public.lists, public.list_media to authenticated;

-- Link-only lists are never enumerable through table SELECTs.
-- This function deliberately bypasses RLS only after an exact token match.
-- Explicit public projection: no user_media_progress, notes, tags or watch links.
create function public.get_shared_list(p_share_slug text, p_limit integer default 50, p_offset integer default 0)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', l.id, 'name', l.name, 'description', l.description,
    'user_id', l.user_id, 'visibility', l.visibility, 'share_slug', l.share_slug,
    'total_count', (select count(*) from public.list_media lm where lm.list_id = l.id),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', item.id, 'created_at', item.created_at,
        'media', jsonb_build_object('id', item.media_id, 'mal_id', item.mal_id,
          'title', item.title, 'image', item.image, 'type', item.type,
          'format', item.format, 'status', item.status, 'total_units', item.total_units, 'score', item.score)
      ) order by item.created_at desc nulls last, item.id)
      from (
        select lm.id, lm.created_at, m.id as media_id, m.mal_id, m.title, m.image,
          m.type, m.format, m.status, m.total_units, m.score
        from public.list_media lm join public.media m on m.id = lm.media_id
        where lm.list_id = l.id
        order by lm.created_at desc nulls last, lm.id
        limit greatest(1, least(coalesce(p_limit, 50), 100))
        offset greatest(0, least(coalesce(p_offset, 0), 1000000))
      ) item
    ), '[]'::jsonb)
  )
  from public.lists l
  where p_share_slug ~ '^[0-9a-f]{32}$' and l.share_slug = p_share_slug
    and l.visibility in ('link', 'public');
$$;
revoke all on function public.get_shared_list(text, integer, integer) from public, anon, authenticated;
grant execute on function public.get_shared_list(text, integer, integer) to anon, authenticated;

comment on column public.lists.visibility is 'private: owner only; link: exact share token only; public: visible on profile and by token';
comment on function public.get_shared_list(text, integer, integer) is 'Read-only public list projection by exact token. NULL for unavailable/private/invalid links. Never returns personal progress or metadata.';
notify pgrst, 'reload schema';
commit;
