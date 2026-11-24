import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
test('la migración conserva entradas, renueva revisiones y limita la edición al titular', { skip: !process.env.PGLITE_MODULE }, async () => {
  const { PGlite } = require(process.env.PGLITE_MODULE);
  const db = new PGlite();
  const owner = '00000000-0000-4000-8000-000000000001';
  const other = '00000000-0000-4000-8000-000000000002';
  const id = '00000000-0000-4000-8000-000000000010';
  const migration = readFileSync('supabase/migrations/202611200001_hentai_editor.sql', 'utf8');
  const rows = async (sql, params = []) => (await db.query(sql, params)).rows;
  const asUser = async user => {
    await db.exec('reset role');
    await rows("select set_config('request.jwt.claim.sub', $1, false)", [user]);
    await db.exec('set role authenticated');
  };
  try {
    await db.exec(`
      create role authenticated;
      create schema auth;
      create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema public, auth to authenticated;
      create table public.hentai(id uuid primary key, user_id uuid, title text, type text, image text, description text, created_at timestamptz, mal_id bigint);
      insert into public.hentai values ('${id}', '${owner}', 'Anterior', 'anime', null, 'Conservar nota', '2026-01-01', 12);
      alter table public.hentai enable row level security;
      create policy own_read on public.hentai for select to authenticated using (user_id = auth.uid());
      -- Simulate an older permissive update policy; the restrictive guard must win.
      create policy old_update on public.hentai for update to authenticated using (true) with check (true);
      grant all on public.hentai to authenticated;
    `);
    await db.exec(migration);
    const before = (await rows('select * from public.hentai'))[0];
    assert.equal(before.description, 'Conservar nota');
    assert.equal(before.watch_link, null);
    assert.ok(before.revision);
    await db.exec(migration);
    assert.equal((await rows('select revision from public.hentai'))[0].revision, before.revision);
    await asUser(owner);
    const changed = (await rows('update public.hentai set description = $1, watch_link = $2 where id = $3 and revision = $4 returning *', ['Nueva nota', 'https://example.test/ver', id, before.revision]))[0];
    assert.notEqual(changed.revision, before.revision);
    assert.equal(changed.created_at.toISOString(), before.created_at.toISOString());
    assert.equal(changed.mal_id, 12);
    assert.equal((await rows('update public.hentai set description = $1 where id = $2 and revision = $3 returning id', ['Edición vieja', id, before.revision])).length, 0);
    await assert.rejects(rows('update public.hentai set user_id = $1 where id = $2', [other, id]), /row-level security/);
    await asUser(other);
    assert.equal((await rows('select * from public.hentai')).length, 0);
    assert.equal((await rows('update public.hentai set description = $1 where id = $2 returning id', ['Ajeno', id])).length, 0);
    await db.exec('reset role');
    assert.equal((await rows('select description from public.hentai'))[0].description, 'Nueva nota');
  } finally { await db.close(); }
});

test('origen y etiquetas preservan registros anteriores y aíslan los filtros y las escrituras por titular', { skip: !process.env.PGLITE_MODULE }, async () => {
  const { PGlite } = require(process.env.PGLITE_MODULE);
  const db = new PGlite();
  const owner = '00000000-0000-4000-8000-000000000001';
  const other = '00000000-0000-4000-8000-000000000002';
  const rows = async (sql, params = []) => (await db.query(sql, params)).rows;
  const asUser = async user => {
    await db.exec('reset role');
    await rows("select set_config('request.jwt.claim.sub', $1, false)", [user]);
    await db.exec('set role authenticated');
  };
  try {
    await db.exec(`
      create role authenticated;
      create role anon;
      create schema auth;
      create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema public, auth to authenticated, anon;
      create table public.hentai(id uuid primary key default gen_random_uuid(), user_id uuid, title text, type text, image text, description text, created_at timestamptz default now(), mal_id bigint);
      insert into public.hentai(user_id, title, type, description) values ('${owner}', 'Anterior', 'doujin', 'Conservar');
      alter table public.hentai enable row level security;
      create policy own_read on public.hentai for select to authenticated using (user_id = auth.uid());
      create policy own_insert on public.hentai for insert to authenticated with check (user_id = auth.uid());
      grant select, insert on public.hentai to authenticated;
    `);
    await db.exec(readFileSync('supabase/migrations/202611200001_hentai_editor.sql', 'utf8'));
    const migration = readFileSync('supabase/migrations/202611200002_hentai_source_anime.sql', 'utf8');
    await db.exec(migration);
    await db.exec(migration);
    const tagsMigration = readFileSync('supabase/migrations/202611230001_hentai_tags.sql', 'utf8');
    await db.exec(tagsMigration);
    await db.exec(tagsMigration);
    const previous = (await rows('select * from public.hentai'))[0];
    assert.equal(previous.source_anime, null);
    assert.equal(previous.is_original, false);
    assert.equal(previous.description, 'Conservar');
    assert.deepEqual(previous.tags, []);
    await asUser(owner);
    for (const source of ['Naruto', 'Naruto', 'Año en 東京', 'Lucky*Star, 100%_']) {
      await rows('insert into public.hentai(user_id, title, type, source_anime) values ($1, $2, $3, $4)', [owner, 'Guardado', 'doujin', source]);
    }
    const changed = (await rows('update public.hentai set is_original = true where id = $1 returning revision', [previous.id]))[0];
    assert.notEqual(changed.revision, previous.revision);
    await assert.rejects(rows('update public.hentai set source_anime = $1 where id = $2', ['Naruto', previous.id]), /check constraint/);
    await assert.rejects(rows('insert into public.hentai(user_id, title, source_anime) values ($1, $2, $3)', [owner, 'Inválido', ' '.repeat(3)]), /check constraint/);
    await assert.rejects(rows('insert into public.hentai(user_id, title, source_anime) values ($1, $2, $3)', [owner, 'Inválido', 'x'.repeat(201)]), /check constraint/);
    const readSources = async () => (await rows('select unnest(public.get_hentai_source_animes()) as source_anime')).map(row => row.source_anime);
    const sources = await readSources();
    assert.equal(sources.length, 3);
    assert.ok(sources.includes('Naruto'));
    assert.ok(sources.includes('Año en 東京'));
    assert.ok(sources.includes('Lucky*Star, 100%_'));
    const tags = ['acción', 'a, "b" \\ c'];
    const tagged = (await rows('update public.hentai set tags = $1 where id = $2 returning revision', [tags, previous.id]))[0];
    assert.notEqual(tagged.revision, changed.revision);
    const selection = '{"acción","a, \\"b\\" \\\\ c"}';
    assert.deepEqual((await rows('select id from public.hentai where tags @> $1::text[]', [selection])).map(row => row.id), [previous.id]);
    await assert.rejects(rows('update public.hentai set tags = $1 where id = $2', [[null], previous.id]), /check constraint/);
    await assert.rejects(rows('update public.hentai set tags = $1 where id = $2', [Array(31).fill('tag'), previous.id]), /check constraint/);
    const options = async () => (await rows('select public.get_hentai_filter_options() as data'))[0].data;
    assert.deepEqual((await options()).tags.sort(), [...tags].sort());
    await rows("insert into public.hentai(user_id, title, source_anime) select $1, 'Otro título', 'Anime ' || n from generate_series(1, 1005) as n", [owner]);
    assert.equal((await readSources()).length, 1008);
    await asUser(other);
    assert.equal((await readSources()).length, 0);
    assert.deepEqual(await options(), { sources: [], tags: [] });
    assert.equal((await rows('update public.hentai set tags = $1 where id = $2 returning id', [['ajena'], previous.id])).length, 0);
    assert.equal((await rows('update public.hentai set source_anime = $1, is_original = false where id = $2 returning id', ['Ajeno', previous.id])).length, 0);
    await rows('insert into public.hentai(user_id, title, source_anime) values ($1, $2, $3)', [other, 'Privado ajeno', 'Anime privado']);
    assert.deepEqual(await readSources(), ['Anime privado']);
    await asUser(owner);
    assert.equal((await readSources()).length, 1008);
    await db.exec('reset role; set role anon');
    await assert.rejects(rows('select * from public.get_hentai_source_animes()'), /permission denied/);
    await assert.rejects(rows('select public.get_hentai_filter_options()'), /permission denied/);
  } finally { await db.close(); }
});
