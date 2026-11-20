-- Personal links and optimistic editing for the existing private collection.
begin;
alter table public.hentai
  add column if not exists watch_link text,
  add column if not exists revision uuid not null default gen_random_uuid();

create or replace function public.refresh_hentai_revision() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.revision := gen_random_uuid();
  return new;
end;
$$;
revoke all on function public.refresh_hentai_revision() from public;
drop trigger if exists refresh_hentai_revision on public.hentai;
create trigger refresh_hentai_revision before update on public.hentai
  for each row execute function public.refresh_hentai_revision();

alter table public.hentai enable row level security;
drop policy if exists hentai_owner_update on public.hentai;
create policy hentai_owner_update on public.hentai for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists hentai_owner_update_guard on public.hentai;
create policy hentai_owner_update_guard on public.hentai as restrictive for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant update (title, type, image, description, watch_link) on public.hentai to authenticated;
grant select (watch_link, revision) on public.hentai to authenticated;
commit;
