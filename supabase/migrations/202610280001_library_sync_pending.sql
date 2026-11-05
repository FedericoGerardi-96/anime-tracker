-- Apply before deploying the application. Queuing is transactional with local writes.
begin;
create table if not exists public.library_sync_pending (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('anilist','myanimelist')),
  account_id bigint not null,
  media_type text not null check (media_type in ('anime','manga')),
  mal_id bigint not null check (mal_id > 0),
  operation text not null check (operation in ('upsert','delete')),
  status text not null default 'plan_to_watch',
  progress integer not null default 0 check (progress >= 0),
  favorite_only boolean not null default false,
  revision uuid not null default gen_random_uuid(),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider, media_type, mal_id)
);
alter table public.library_sync_pending enable row level security;
revoke all on public.library_sync_pending from anon, authenticated;
grant select on public.library_sync_pending to authenticated;
grant all on public.library_sync_pending to service_role;
create policy own_pending_read on public.library_sync_pending for select to authenticated using (user_id = auth.uid());

create or replace function public.capture_library_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  row_data jsonb; uid uuid; mid uuid; external_id bigint; kind text;
  desired_status text := 'plan_to_watch'; desired_progress integer := 0;
  action text := 'upsert'; only_favorite boolean := false;
begin
  -- Remote imports use service_role: never echo those changes back to providers.
  if auth.role() is distinct from 'authenticated' then return null; end if;
  row_data := case when TG_OP = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  uid := (row_data->>'user_id')::uuid;
  if uid is distinct from auth.uid() then raise exception 'Invalid library owner'; end if;
  if TG_TABLE_NAME = 'hentai' then
    external_id := (row_data->>'mal_id')::bigint;
    kind := case when row_data->>'type' = 'anime' then 'anime' else 'manga' end;
    only_favorite := true;
  else
    mid := (row_data->>'media_id')::uuid;
    select m.mal_id, m.type into external_id, kind from public.media m where m.id = mid;
    if TG_TABLE_NAME = 'user_media_progress' then
      if TG_OP = 'UPDATE' and new.status is not distinct from old.status and new.current_episode is not distinct from old.current_episode then return null; end if;
      desired_status := coalesce(row_data->>'status', 'plan_to_watch');
      desired_progress := coalesce((row_data->>'current_episode')::integer, 0);
      only_favorite := TG_OP = 'INSERT' and desired_status = 'plan_to_watch' and desired_progress = 0;
    else
      only_favorite := true;
      select coalesce(p.status, 'plan_to_watch'), coalesce(p.current_episode, 0) into desired_status, desired_progress
      from public.user_media_progress p where p.user_id = uid and p.media_id = mid;
    end if;
  end if;
  if external_id is null or external_id <= 0 or kind not in ('anime','manga') then return null; end if;
  if TG_OP = 'DELETE' then action := 'delete'; end if;
  insert into public.library_sync_pending (user_id,provider,account_id,media_type,mal_id,operation,status,progress,favorite_only)
  select uid, c.provider, c.account_id, kind, external_id, action, coalesce(desired_status,'plan_to_watch'), coalesce(desired_progress,0), only_favorite
  from (
    select 'anilist'::text provider, a.anilist_user_id::bigint account_id from public.anilist_connections a where a.user_id = uid
    union all
    select 'myanimelist', m.mal_user_id::bigint from public.mal_connections m where m.user_id = uid
  ) c
  on conflict (user_id,provider,media_type,mal_id) do update set
    account_id = excluded.account_id, operation = excluded.operation, status = excluded.status,
    progress = excluded.progress, favorite_only = excluded.favorite_only,
    revision = gen_random_uuid(), updated_at = now();
  return null;
end $$;
revoke all on function public.capture_library_change() from public;
create trigger queue_favorite_change after insert or delete on public.favorites for each row execute function public.capture_library_change();
create trigger queue_progress_change after insert or update on public.user_media_progress for each row execute function public.capture_library_change();
create trigger queue_private_favorite_change after insert or delete on public.hentai for each row execute function public.capture_library_change();
commit;
