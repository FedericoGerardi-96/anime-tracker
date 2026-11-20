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
