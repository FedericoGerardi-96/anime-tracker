import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const modulePath = process.env.PGLITE_MODULE;
const owner = '00000000-0000-0000-0000-000000000001';
const other = '00000000-0000-0000-0000-000000000002';
const legacy = '00000000-0000-0000-0000-000000000010';
const media = '00000000-0000-0000-0000-000000000020';
const secondMedia = '00000000-0000-0000-0000-000000000021';
const copyId = '00000000-0000-0000-0000-000000000030';
const failedCopyId = '00000000-0000-0000-0000-000000000031';

test('list migrations: visibility, capability links, follows and copies', { skip: !modulePath }, async t => {
  const { PGlite } = require(modulePath);
  const db = new PGlite();
  const query = async (sql, params = []) => (await db.query(sql, params)).rows;
  const as = async (role, user = '') => {
    await db.exec('reset role');
    await query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
    await db.exec(`set role ${role}`);
  };
  const shared = async (slug, limit = 50, offset = 0) => (await query('select public.get_shared_list($1, $2, $3) as data', [slug, limit, offset]))[0].data;
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create table auth.users(id uuid primary key);
      insert into auth.users values ('${owner}'), ('${other}');
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
      grant usage on schema public, auth to anon, authenticated;
      create table public.lists(id uuid primary key default gen_random_uuid(), name text not null, description text, user_id uuid,
        created_at timestamptz default now(), updated_at timestamptz default now());
      create table public.media(id uuid primary key, mal_id bigint, title text, image text, type text, format text, status text, total_units integer, score numeric);
      create table public.list_media(id uuid primary key default gen_random_uuid(), list_id uuid references lists(id), media_id uuid references media(id), created_at timestamptz default now());
      create table public.user_media_progress(user_id uuid, media_id uuid, custom_description text, watch_link text, current_episode integer);
      alter table public.user_media_progress enable row level security;
      create policy own_progress on public.user_media_progress to authenticated using (user_id = auth.uid());
      grant select on public.user_media_progress to anon, authenticated;
      insert into lists(id,name,user_id) values ('${legacy}', 'Existing private list', '${owner}');
      insert into media values ('${media}', 12, 'Example manga', 'image', 'manga', 'MANGA', 'RELEASING', 24, 8.5);
      insert into list_media(list_id,media_id) values ('${legacy}', '${media}');
      insert into user_media_progress values ('${owner}','${media}','Private note','https://private.example',5);
      -- Simulate unsafe old permissions: the new restrictive guards must still win.
      alter table lists enable row level security;
      alter table list_media enable row level security;
      create policy legacy_open_lists on lists for all to public using (true) with check (true);
      create policy legacy_open_items on list_media for all to public using (true) with check (true);
      grant all on lists, list_media to public, anon, authenticated;
    `);
    await db.exec(fs.readFileSync('supabase/checks/list_visibility_preflight.sql', 'utf8'));
    await db.exec(fs.readFileSync('supabase/migrations/202611070001_list_visibility.sql', 'utf8'));
    let privateList, linkedList, publicList, otherList;

    await t.test('existing and newly created lists are private; invalid visibility is rejected', async () => {
      await as('authenticated', owner);
      const existing = (await query('select * from lists where id = $1', [legacy]))[0];
      assert.equal(existing.visibility, 'private'); assert.equal(existing.share_slug, null);
      privateList = (await query('insert into lists(name,user_id) values ($1,$2) returning *', ['Private', owner]))[0];
      assert.equal(privateList.visibility, 'private'); assert.equal(privateList.share_slug, null);
      await assert.rejects(query("insert into lists(name,user_id,visibility) values ('Bad',$1,'friends')", [owner]));
      await assert.rejects(query("insert into lists(name,user_id,visibility) values ('Bad',$1,null)", [owner]));
      await assert.rejects(query("insert into lists(name,user_id) values ('Forged',$1)", [other]));
    });

    await t.test('owner can create shared lists and add titles; server generates distinct strong tokens', async () => {
      linkedList = (await query("insert into lists(name,user_id,visibility,share_slug) values ('Link',$1,'link','chosen') returning *", [owner]))[0];
      publicList = (await query("insert into lists(name,user_id,visibility) values ('Public',$1,'public') returning *", [owner]))[0];
      assert.match(linkedList.share_slug, /^[0-9a-f]{32}$/);
      assert.notEqual(linkedList.share_slug, publicList.share_slug);
      await query('insert into list_media(list_id,media_id) values ($1,$3),($2,$3)', [linkedList.id, publicList.id, media]);
      const changed = (await query("update lists set name = 'Renamed', share_slug = 'chosen' where id = $1 returning *", [linkedList.id]))[0];
      assert.equal(changed.share_slug, linkedList.share_slug);
      assert.equal((await query('select id from lists')).length, 4);
    });

    await t.test('anonymous enumeration only exposes public lists and their items', async () => {
      await as('anon');
      assert.deepEqual((await query('select id from lists')).map(row => row.id), [publicList.id]);
      assert.equal((await query('select * from lists where id = $1', [linkedList.id])).length, 0);
      assert.equal((await query('select * from list_media where list_id = $1', [linkedList.id])).length, 0);
      assert.equal((await query('select * from list_media')).length, 1);
      assert.equal((await query('select * from user_media_progress')).length, 0);
      await assert.rejects(db.exec('truncate lists cascade'));
      await assert.rejects(query('update lists set name = $1 where id = $2', ['Hacked', publicList.id]));
      await assert.rejects(query('delete from list_media where list_id = $1', [publicList.id]));
    });

    await t.test('link reader accepts only exact tokens and never exposes private personal fields', async () => {
      for (const slug of [null, '', '%', linkedList.id, linkedList.share_slug.slice(0, 8), '0'.repeat(32)]) assert.equal(await shared(slug), null);
      const result = await shared(linkedList.share_slug);
      assert.equal(result.id, linkedList.id); assert.equal(result.items.length, 1);
      assert.deepEqual(Object.keys(result.items[0].media).sort(), ['format','id','image','mal_id','score','status','title','total_units','type'].sort());
      for (const forbidden of ['Private note', 'private.example', 'current_episode', 'custom_tags', 'watch_link']) assert.equal(JSON.stringify(result).includes(forbidden), false);
      assert.equal((await shared(publicList.share_slug)).id, publicList.id);
    });

    await t.test('another account cannot edit any foreign visibility, ownership or membership', async () => {
      await as('authenticated', other);
      otherList = (await query("insert into lists(name,user_id) values ('Other',$1) returning *", [other]))[0];
      assert.equal((await query('select id from lists')).length, 2);
      for (const list of [privateList, linkedList, publicList]) {
        assert.equal((await query("update lists set visibility = 'public', name = 'Hacked' where id = $1 returning id", [list.id])).length, 0);
        assert.equal((await query('delete from lists where id = $1 returning id', [list.id])).length, 0);
        await assert.rejects(query('insert into list_media(list_id,media_id) values ($1,$2)', [list.id, media]));
      }
      assert.equal((await query('delete from list_media where list_id = $1 returning id', [publicList.id])).length, 0);
      await query('insert into list_media(list_id,media_id) values ($1,$2)', [otherList.id, media]);
      await assert.rejects(query('update list_media set list_id = $1 where list_id = $2', [publicList.id, otherList.id]));
      await assert.rejects(query('update lists set user_id = $1 where id = $2', [owner, otherList.id]));
      assert.equal((await shared(linkedList.share_slug)).id, linkedList.id);
      assert.equal((await query('select * from user_media_progress')).length, 0);
    });

    await t.test('switching public to link hides it from profiles but retains its URL', async () => {
      await as('authenticated', owner);
      await query("update lists set visibility = 'link' where id = $1", [publicList.id]);
      await as('anon');
      assert.equal((await query('select * from lists')).length, 0);
      assert.equal((await shared(publicList.share_slug)).id, publicList.id);
    });

    await t.test('private revokes existing URLs immediately; sharing again rotates token', async () => {
      await as('authenticated', owner);
      await query("update lists set visibility = 'private' where id = $1", [linkedList.id]);
      assert.equal((await query('select share_slug from lists where id = $1', [linkedList.id]))[0].share_slug, null);
      await as('anon'); assert.equal(await shared(linkedList.share_slug), null);
      await as('authenticated', owner);
      const next = (await query("update lists set visibility = 'link' where id = $1 returning share_slug", [linkedList.id]))[0].share_slug;
      assert.notEqual(next, linkedList.share_slug);
      await as('anon');
      assert.equal(await shared(linkedList.share_slug), null);
      assert.equal((await shared(next)).id, linkedList.id);
      linkedList.share_slug = next;
    });

    await t.test('shared read is paginated, bounded and handles empty lists', async () => {
      await as('authenticated', owner);
      await query('insert into list_media(list_id,media_id) select $1,$2 from generate_series(1,104)', [linkedList.id, media]);
      const empty = (await query("insert into lists(name,user_id,visibility) values ('Empty',$1,'link') returning *", [owner]))[0];
      await as('anon');
      const first = await shared(linkedList.share_slug, 1000, -10);
      assert.equal(first.total_count, 105); assert.equal(first.items.length, 100);
      const second = await shared(linkedList.share_slug, 100, 100);
      assert.equal(second.items.length, 5);
      assert.equal(new Set([...first.items, ...second.items].map(item => item.id)).size, 105);
      assert.equal((await shared(linkedList.share_slug, 10, 999)).items.length, 0);
      assert.equal((await shared(empty.share_slug)).items.length, 0);
      assert.equal((await shared(linkedList.share_slug, null, null)).items.length, 50);
    });

    await t.test('owner can update and remove memberships and delete an empty list', async () => {
      await as('authenticated', other);
      assert.equal((await query('delete from list_media where list_id = $1 returning id', [otherList.id])).length, 1);
      assert.equal((await query('delete from lists where id = $1 returning id', [otherList.id])).length, 1);
    });

    await db.exec('reset role');
    await db.exec(fs.readFileSync('supabase/migrations/202611070002_list_follows_and_copies.sql', 'utf8'));
    const follow = slug => query('select public.follow_shared_list($1) as id', [slug]);
    const followed = () => query('select * from public.get_my_followed_lists()');
    const copy = (slug, id = copyId) => query('select public.copy_shared_list($1, $2) as id', [slug, id]);

    await t.test('following needs a signed-in non-owner and the exact token', async () => {
      await as('anon');
      await assert.rejects(follow(publicList.share_slug), { code: '42501' });
      await assert.rejects(followed(), { code: '42501' });
      await assert.rejects(copy(publicList.share_slug), { code: '42501' });
      await as('authenticated');
      await assert.rejects(follow(publicList.share_slug), { code: '42501' });
      await assert.rejects(copy(publicList.share_slug), { code: '42501' });
      await as('authenticated', owner);
      await assert.rejects(follow(publicList.share_slug), { code: 'P0002' });
      await assert.rejects(copy(publicList.share_slug), { code: 'P0002' });
      await as('authenticated', other);
      await assert.rejects(follow(publicList.id), { code: 'P0002' });
      await assert.rejects(copy(publicList.id), { code: 'P0002' });
      await assert.rejects(query('insert into list_follows(user_id,list_id,share_slug) values ($1,$2,$3)', [other, publicList.id, publicList.share_slug]), { code: '42501' });
    });

    await t.test('follow is idempotent, isolated and shows live list changes without widening table access', async () => {
      assert.equal((await follow(publicList.share_slug))[0].id, publicList.id);
      const initial = (await followed())[0];
      await follow(publicList.share_slug);
      assert.deepEqual(await followed(), [initial]);
      assert.equal((await query('select id from lists where id = $1', [publicList.id])).length, 0);
      await assert.rejects(query('select share_slug from list_follows'), { code: '42501' });
      await as('authenticated', owner);
      assert.deepEqual(await followed(), []);
      assert.equal((await query('delete from list_follows where list_id = $1 returning list_id', [publicList.id])).length, 0);
      await query("update lists set name = 'Updated original' where id = $1", [publicList.id]);
      await db.exec('reset role');
      await query("insert into media values ($1, 13, 'Second title', null, 'anime', 'TV', 'FINISHED', 12, 8)", [secondMedia]);
      await as('authenticated', owner);
      await query("insert into list_media(list_id,media_id,created_at) values ($1,$2,'2026-01-01')", [publicList.id, secondMedia]);
      await query("update list_media set created_at = '2026-01-01' where list_id = $1", [publicList.id]);
      await as('authenticated', other);
      assert.equal((await followed())[0].name, 'Updated original');
      assert.equal(Number((await followed())[0].total_count), 2);
    });

    await t.test('copy retains source order, is private and editable, and retries reuse the copy', async () => {
      const created = (await query("insert into lists(name, description, user_id) values ('New list', null, $1) returning *", [other]))[0];
      assert.equal(created.visibility, 'private');
      assert.equal(created.copied_from_list_id, null);
      const expected = (await shared(publicList.share_slug)).items.map(item => item.media.id);
      assert.equal((await copy(publicList.share_slug))[0].id, copyId);
      const saved = (await query('select * from lists where id = $1', [copyId]))[0];
      assert.equal(saved.user_id, other);
      assert.equal(saved.name, 'Updated original (copia)');
      assert.equal(saved.visibility, 'private');
      assert.equal(saved.share_slug, null);
      assert.equal(saved.copied_from_list_id, publicList.id);
      assert.deepEqual((await query('select media_id from list_media where list_id = $1 order by created_at desc, id', [copyId])).map(item => item.media_id), expected);
      assert.deepEqual(await query('select * from user_media_progress'), []);
      await query("update lists set name = 'My edits' where id = $1", [copyId]);
      await query('delete from list_media where list_id = $1 and media_id = $2', [copyId, media]);
      assert.equal((await copy(publicList.share_slug))[0].id, copyId);
      assert.equal((await query('select name from lists where id = $1', [copyId]))[0].name, 'My edits');
      assert.equal((await query('select id from list_media where list_id = $1', [copyId])).length, 1);
      assert.equal((await shared(publicList.share_slug)).items.length, 2);
      await assert.rejects(query('update lists set copied_from_list_id = $1 where id = $2', [legacy, copyId]), { code: '42501' });
      await assert.rejects(copy(linkedList.share_slug, copyId), { code: '23505' });
      await as('authenticated', owner);
      assert.equal((await query('select id from lists where id = $1', [copyId])).length, 0);
    });

    await t.test('copy is atomic and does not truncate to a shared page', async () => {
      await db.exec('reset role');
      await db.exec(`alter table list_media add constraint fail_test_copy check (list_id <> '${failedCopyId}')`);
      await as('authenticated', other);
      await assert.rejects(copy(linkedList.share_slug, failedCopyId), { code: '23514' });
      assert.deepEqual(await query('select id from lists where id = $1', [failedCopyId]), []);
      await db.exec('reset role');
      await db.exec('alter table list_media drop constraint fail_test_copy');
      await as('authenticated', other);
      await copy(linkedList.share_slug, failedCopyId);
      assert.equal((await query('select id from list_media where list_id = $1', [failedCopyId])).length, 105);
    });

    await t.test('revocation hides followed metadata without touching a copy, and a new link requires following again', async () => {
      await as('authenticated', owner);
      await query("update lists set visibility = 'private' where id = $1", [publicList.id]);
      await as('authenticated', other);
      const revoked = (await followed())[0];
      assert.equal(revoked.list_id, publicList.id);
      for (const field of ['name', 'owner_id', 'share_slug', 'total_count']) assert.equal(revoked[field], null);
      await assert.rejects(follow(publicList.share_slug), { code: 'P0002' });
      await assert.rejects(copy(publicList.share_slug), { code: 'P0002' });
      assert.equal((await query('select name from lists where id = $1', [copyId]))[0].name, 'My edits');
      await as('authenticated', owner);
      const updated = (await query("update lists set visibility = 'link' where id = $1 returning share_slug", [publicList.id]))[0];
      await as('authenticated', other);
      assert.equal((await followed())[0].share_slug, null);
      await follow(updated.share_slug);
      assert.equal((await followed())[0].share_slug, updated.share_slug);
      await query('delete from list_follows where list_id = $1', [publicList.id]);
      assert.deepEqual(await followed(), []);
      await follow(updated.share_slug);
      await as('authenticated', owner);
      await query('delete from list_media where list_id = $1', [publicList.id]);
      await query('delete from lists where id = $1', [publicList.id]);
      await as('authenticated', other);
      assert.deepEqual(await followed(), []);
      const saved = (await query('select name,copied_from_list_id from lists where id = $1', [copyId]))[0];
      assert.equal(saved.name, 'My edits');
      assert.equal(saved.copied_from_list_id, null);
    });
  } finally { await db.close(); }
});
