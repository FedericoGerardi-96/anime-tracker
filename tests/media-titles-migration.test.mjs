import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
test('la migración es aditiva y repetible, conserva títulos, relaciones y aislamiento existentes', { skip: !process.env.PGLITE_MODULE }, async () => {
  const { PGlite } = require(process.env.PGLITE_MODULE);
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create table media(id int primary key, mal_id int, type text, title text);
      create table favorites(user_id text, media_id int references media(id));
      create table user_media_progress(user_id text, media_id int references media(id), current_episode int);
      insert into media values (1,37786,'anime','Bloom Into You');
      insert into favorites values ('a',1),('b',1);
      insert into user_media_progress values ('a',1,3),('b',1,10);
      alter table media enable row level security;
      alter table favorites enable row level security;
      alter table user_media_progress enable row level security;
      create policy catalog_read on media for select to anon,authenticated using (true);
      create policy own_favorites on favorites to authenticated using (user_id = current_setting('app.uid',true));
      create policy own_progress on user_media_progress to authenticated using (user_id = current_setting('app.uid',true));
      grant select on media to anon,authenticated;
      grant select on favorites,user_media_progress to authenticated;
    `);
    const migration = fs.readFileSync('supabase/migrations/202611110001_media_title_variants.sql', 'utf8');
    await db.exec(migration); await db.exec(migration);
    assert.equal((await db.query('select title from media')).rows[0].title, 'Bloom Into You');
    await db.exec("update media set title_english='Bloom Into You',title_romaji='Yagate Kimi ni Naru'; set role authenticated; set app.uid='a';");
    assert.equal((await db.query('select * from favorites')).rows.length, 1);
    assert.equal((await db.query('select * from user_media_progress')).rows[0].current_episode, 3);
    assert.equal((await db.query('select title_romaji from media')).rows[0].title_romaji, 'Yagate Kimi ni Naru');
    await db.exec("set app.uid='b'");
    assert.equal((await db.query('select * from user_media_progress')).rows[0].current_episode, 10);
    await db.exec('reset role; set role anon');
    assert.equal((await db.query('select title from media')).rows[0].title, 'Bloom Into You');
    await assert.rejects(db.exec("update media set title_romaji='Modificado'"));
    await assert.rejects(db.query('select * from user_media_progress'));
    await db.exec('reset role');
    assert.equal((await db.query('select * from favorites')).rows.length, 2);
  } finally { await db.close(); }
});
