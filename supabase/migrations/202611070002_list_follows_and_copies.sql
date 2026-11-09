-- Requires 202611070001_list_visibility.sql.
begin;

create table public.list_follows (
  user_id uuid not null references auth.users(id) on delete cascade,
  list_id uuid not null references public.lists(id) on delete cascade,
  share_slug text not null check (share_slug ~ '^[0-9a-f]{32}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, list_id)
);
create index list_follows_list_id_idx on public.list_follows (list_id);
create index list_follows_user_created_idx on public.list_follows (user_id, created_at desc, list_id);

alter table public.list_follows enable row level security;
create policy list_follows_own_read on public.list_follows for select to authenticated
  using (user_id = (select auth.uid()));
create policy list_follows_own_delete on public.list_follows for delete to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.list_follows from public, anon, authenticated;
grant select (user_id, list_id, created_at), delete on public.list_follows to authenticated;

alter table public.lists add column copied_from_list_id uuid
  references public.lists(id) on delete set null;
create index lists_copied_from_idx on public.lists (copied_from_list_id)
  where copied_from_list_id is not null;

-- Preserve the existing writable columns. Only the copy RPC sets provenance.
revoke insert, update on public.lists from public, anon, authenticated;
grant insert (id, name, description, user_id, created_at, updated_at, visibility, share_slug),
  update (id, name, description, user_id, created_at, updated_at, visibility, share_slug)
  on public.lists to authenticated;

-- A known list ID is insufficient for saving a link-only list.
create function public.follow_shared_list(p_share_slug text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  follower uuid := auth.uid();
  source_id uuid;
begin
  if follower is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  -- Serialize authorization with a concurrent visibility change.
  select l.id into source_id
  from public.lists l
  where p_share_slug ~ '^[0-9a-f]{32}$' and l.share_slug = p_share_slug
    and l.visibility in ('link', 'public') and l.user_id <> follower
  for share;
  if not found then
    raise exception 'Shared list unavailable' using errcode = 'P0002';
  end if;

  insert into public.list_follows as f (user_id, list_id, share_slug)
  values (follower, source_id, p_share_slug)
  on conflict (user_id, list_id) do update
    set share_slug = excluded.share_slug, created_at = now()
    where f.share_slug <> excluded.share_slug;

  return source_id;
end;
$$;

-- Keep revoked subscriptions removable. Return original metadata only while
-- the sharing token used to follow is still current.
create function public.get_my_followed_lists(p_limit integer default 50, p_offset integer default 0)
returns table (list_id uuid, followed_at timestamptz, name text, owner_id uuid, share_slug text, total_count bigint)
language sql stable security definer set search_path = '' as $$
  select f.list_id, f.created_at, l.name, l.user_id, l.share_slug,
    case when l.id is not null then (select count(*) from public.list_media lm where lm.list_id = l.id) end
  from public.list_follows f
  left join public.lists l on l.id = f.list_id and l.share_slug = f.share_slug
    and l.visibility in ('link', 'public')
  where f.user_id = (select auth.uid())
  order by f.created_at desc, f.list_id
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(0, least(coalesce(p_offset, 0), 1000000));
$$;

-- Generate the ID once per copy intent and reuse it for retries.
create function public.copy_shared_list(p_share_slug text, p_copy_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  recipient uuid := auth.uid();
  source record;
  copy_id uuid;
begin
  if recipient is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_copy_id is null then
    raise exception 'Copy ID required' using errcode = '22023';
  end if;

  select l.id, l.name, l.description into source
  from public.lists l
  where p_share_slug ~ '^[0-9a-f]{32}$' and l.share_slug = p_share_slug
    and l.visibility in ('link', 'public') and l.user_id <> recipient
  for share;
  if not found then
    raise exception 'Shared list unavailable' using errcode = 'P0002';
  end if;

  insert into public.lists (id, user_id, name, description, visibility, copied_from_list_id)
  values (p_copy_id, recipient, source.name || ' (copia)', source.description, 'private', source.id)
  on conflict (id) do nothing
  returning id into copy_id;

  if copy_id is null then
    if exists (
      select 1 from public.lists l where l.id = p_copy_id
        and l.user_id = recipient and l.copied_from_list_id = source.id
    ) then
      return p_copy_id;
    end if;
    raise exception 'Copy ID unavailable' using errcode = '23505';
  end if;

  -- Preserve the shared view's order, including ties in source timestamps.
  insert into public.list_media (list_id, media_id, created_at)
  select copy_id, lm.media_id, statement_timestamp() -
    (row_number() over (order by lm.created_at desc nulls last, lm.id) - 1) * interval '1 microsecond'
  from public.list_media lm
  join public.media m on m.id = lm.media_id
  where lm.list_id = source.id;

  return copy_id;
end;
$$;

revoke all on function public.follow_shared_list(text), public.get_my_followed_lists(integer, integer),
  public.copy_shared_list(text, uuid) from public, anon, authenticated;
grant execute on function public.follow_shared_list(text), public.get_my_followed_lists(integer, integer),
  public.copy_shared_list(text, uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
