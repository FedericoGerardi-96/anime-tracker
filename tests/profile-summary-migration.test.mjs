import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const modulePath = process.env.PGLITE_MODULE;
const owner = '00000000-0000-4000-8000-000000000001';
const friend = '00000000-0000-4000-8000-000000000002';
const stranger = '00000000-0000-4000-8000-000000000003';

test('profile summary checks library privacy and exposes only three anime in progress', { skip: !modulePath }, async () => {
  const { PGlite } = require(modulePath);
  const db = new PGlite();
  const query = async (sql, params) => (await db.query(sql, params)).rows;
  const as = async (role, user = '') => {
    await db.exec('reset role');
    await query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
    await db.exec(`set role ${role}`);
  };
  const summary = async (id = owner, username = 'example') => (await query(
    'select public.get_visible_profile_anime_summary($1, $2) as summary', [id, username],
  ))[0].summary;
  const visibility = async value => {
    await db.exec('reset role');
    await query('update profile_privacy set library_favorites_visibility = $1', [value]);
  };
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      create table profile_privacy(user_id uuid primary key, library_favorites_visibility text);
      insert into profile_privacy values ('${owner}', 'private');
      -- Existing social RPC is simulated with an independent friendship and profile visibility check.
      create function get_social_profile(profile_username text)
      returns table(id uuid, relationship text, can_view_library boolean)
      language sql stable as $$
        select '${owner}'::uuid,
          case when auth.uid() = '${friend}' then 'friends' else 'none' end,
          profile_username = 'example'
        where profile_username in ('example', 'unavailable')
      $$;
      create table media(id int primary key, mal_id int, title text, image text, type text,
        total_units int, season text, year int, genres text[]);
      create table user_media_progress(id int primary key, user_id uuid, media_id int,
        current_episode int, status text, updated_at timestamptz, custom_description text, watch_link text);
      alter table user_media_progress enable row level security;
      create policy own_progress on user_media_progress to authenticated using (user_id = auth.uid());
      grant select on user_media_progress to anon, authenticated;
      insert into media
      select id, id, 'Title ' || id, null, case when id = 6 then 'manga' else 'anime' end, 12,
        case when id between 2 and 3 then
          upper((array['winter','spring','summer','fall'])[extract(quarter from local_now)::int]) end,
        extract(year from local_now)::int, case when id = 1 then array['Drama','Drama'] else array['Fantasy'] end
      from generate_series(1, 7) id
      cross join (select current_timestamp at time zone 'America/Argentina/Buenos_Aires' as local_now) current_period;
      insert into user_media_progress
      select id, case when id = 7 then '${stranger}'::uuid else '${owner}'::uuid end, id, id,
        case when id = 5 then 'completed' else 'watching' end,
        current_timestamp - id * interval '1 day', 'private note', 'https://private.example'
      from generate_series(1, 7) id;
    `);
    await db.exec(readFileSync(new URL('../supabase/migrations/202611080001_visible_profile_anime_summary.sql', import.meta.url), 'utf8'));

    await as('authenticated', owner);
    const data = await summary(owner, null);
    assert.deepEqual(data.watching.map(row => row.mal_id), [2, 3, 1]);
    assert.deepEqual(data.watching[0], { mal_id: 2, title: 'Title 2', image: null, total_units: 12, current_episode: 2 });
    assert.equal(data.episodes, 15);
    assert.equal(data.completed, 1);
    assert.deepEqual(data.genres, [{ name: 'Fantasy', count: 4 }, { name: 'Drama', count: 1 }]);

    await as('anon');
    assert.equal(await summary(), null);
    await visibility('friends');
    await as('authenticated', stranger);
    assert.equal(await summary(), null);
    await as('authenticated', friend);
    assert.deepEqual(await summary(), data);
    await visibility('public');
    await as('anon');
    assert.deepEqual(await summary(), data);
    assert.equal(await summary(stranger), null);
    assert.equal(await summary(owner, 'unavailable'), null);
    assert.deepEqual(await query('select * from user_media_progress'), []);
    await visibility('private');
    await as('anon');
    assert.equal(await summary(), null);
  } finally {
    await db.close();
  }
});
