-- Read-only projection. Keep progress rows and personal metadata behind their existing RLS.
begin;

create function public.get_visible_profile_anime_summary(target_user_id uuid, profile_username text default null)
returns jsonb
language sql stable security definer set search_path = '' as $$
  with allowed as (
    select target_user_id as id
    where target_user_id = (select auth.uid())
      or exists (
        select 1 from public.get_social_profile(profile_username) profile
        join public.profile_privacy privacy on privacy.user_id = profile.id
        where profile.id = target_user_id and profile.can_view_library is true
          and (privacy.library_favorites_visibility = 'public'
            or (privacy.library_favorites_visibility = 'friends' and profile.relationship = 'friends'))
      )
  ), progress as (
    select p.id, p.status, p.updated_at, greatest(p.current_episode, 0) as current_episode,
      m.mal_id, m.title, m.image, m.total_units, m.season, m.year, m.genres
    from allowed a join public.user_media_progress p on p.user_id = a.id
    join public.media m on m.id = p.media_id and m.type = 'anime'
  ), current_period as (
    select extract(year from local_now) as year,
      (array['winter', 'spring', 'summer', 'fall'])[extract(quarter from local_now)::int] as season
    from (select current_timestamp at time zone 'America/Argentina/Buenos_Aires' as local_now) local_time
  )
  select jsonb_build_object(
    'completed', (select count(*) from progress where status = 'completed'),
    'episodes', (select coalesce(sum(current_episode), 0) from progress),
    'genres', coalesce((
      select jsonb_agg(jsonb_build_object('name', g.name, 'count', g.total)
        order by g.total desc, g.name collate "C")
      from (
        select btrim(genre) as name, count(distinct p.id) as total
        from progress p cross join lateral unnest(p.genres) genre
        where (p.current_episode > 0 or p.status = 'completed') and btrim(genre) <> ''
        group by btrim(genre)
        order by total desc, btrim(genre) collate "C"
        limit 5
      ) g
    ), '[]'::jsonb),
    'watching', coalesce((
      select jsonb_agg(jsonb_build_object('mal_id', w.mal_id, 'title', w.title,
        'image', w.image, 'total_units', w.total_units, 'current_episode', w.current_episode)
        order by w.in_season desc, w.updated_at desc nulls last, w.id)
      from (
        select p.*, coalesce(lower(p.season::text) = c.season and p.year = c.year, false) as in_season
        from progress p cross join current_period c
        where p.status = 'watching' and p.mal_id > 0
        order by in_season desc, p.updated_at desc nulls last, p.id
        limit 3
      ) w
    ), '[]'::jsonb)
  ) from allowed;
$$;

revoke all on function public.get_visible_profile_anime_summary(uuid, text) from public, anon, authenticated;
grant execute on function public.get_visible_profile_anime_summary(uuid, text) to anon, authenticated;
comment on function public.get_visible_profile_anime_summary(uuid, text) is
  'Profile anime aggregates and up to three watching rows. Requires ownership or existing social library visibility.';
notify pgrst, 'reload schema';
commit;
