-- Apply after 202611200002_hentai_source_anime.sql.
begin;

alter table public.hentai
  add column if not exists tags text[] not null default '{}';

alter table public.hentai drop constraint if exists hentai_tags_valid;
alter table public.hentai add constraint hentai_tags_valid check (
  case
    when coalesce(array_ndims(tags), 1) > 1 then false
    else cardinality(tags) <= 30 and array_position(tags, null::text) is null
  end
);

grant select (tags), insert (tags), update (tags) on public.hentai to authenticated;

create index if not exists hentai_tags_gin_idx on public.hentai using gin(tags);

create or replace function public.get_hentai_filter_options()
returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'sources', public.get_hentai_source_animes(),
    'tags', coalesce(array_agg(labels.label order by labels.label), array[]::text[])
  )
  from (
    select distinct t.label
    from public.hentai h
    cross join lateral unnest(h.tags) as t(label)
    where h.user_id = (select auth.uid())
  ) labels;
$$;

revoke all on function public.get_hentai_filter_options() from public, anon;
grant execute on function public.get_hentai_filter_options() to authenticated;

commit;
