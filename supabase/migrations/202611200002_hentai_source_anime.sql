-- Local classification: an original work or the anime it is based on.
-- Apply after 202611200001_hentai_editor.sql.
begin;

alter table public.hentai
  add column if not exists source_anime text,
  add column if not exists is_original boolean not null default false;

alter table public.hentai drop constraint if exists hentai_source_anime_valid;
alter table public.hentai add constraint hentai_source_anime_valid check (
  (source_anime is null or (char_length(source_anime) between 1 and 200 and source_anime = btrim(source_anime)))
  and not (is_original and source_anime is not null)
);

grant select (source_anime, is_original), insert (source_anime, is_original), update (source_anime, is_original)
  on public.hentai to authenticated;

create index if not exists hentai_user_source_anime_idx on public.hentai (user_id, source_anime)
  where source_anime is not null;

create or replace function public.get_hentai_source_animes()
returns text[]
language sql stable security invoker set search_path = '' as $$
  select coalesce(array_agg(sources.source_anime order by lower(sources.source_anime), sources.source_anime), array[]::text[])
  from (
    select distinct h.source_anime from public.hentai h
    where h.user_id = (select auth.uid()) and h.source_anime is not null
  ) sources;
$$;
revoke all on function public.get_hentai_source_animes() from public, anon;
grant execute on function public.get_hentai_source_animes() to authenticated;

commit;
