import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire, registerHooks } from 'node:module';
import test from 'node:test';
import sharp from 'sharp';
import ts from 'typescript';
import { PROFILE_IMAGE_INPUT_LIMIT, PROFILE_IMAGE_SPECS } from '../src/lib/profile-image.ts';

const require = createRequire(import.meta.url);
const hook = registerHooks({
  resolve(specifier, context, next) {
    return next(specifier === '@/lib/profile-image' ? new URL('../src/lib/profile-image.ts', import.meta.url).href : specifier, context);
  },
  load(url, context, next) {
    if (!url.endsWith('/profile-image-encoding.ts')) return next(url, context);
    return {
      format: 'module', shortCircuit: true,
      source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
      }).outputText,
    };
  },
});
const { encodeProfileImage, readProfileImage } = await import('../src/services/profile-image-encoding.ts');
hook.deregister();

test('optimiza la foto y la portada a WebP dentro del presupuesto y quita EXIF', async () => {
  const input = await sharp({ create: { width: 1600, height: 900, channels: 3, background: '#8466de' } })
    .withMetadata({ orientation: 6 }).jpeg().toBuffer();
  for (const [kind, spec] of Object.entries(PROFILE_IMAGE_SPECS)) {
    const image = await encodeProfileImage(input, kind);
    const meta = await sharp(image).metadata();
    assert.equal(meta.format, 'webp');
    assert.equal(meta.width / meta.height, spec.width / spec.height);
    assert.ok(meta.width <= spec.width && meta.height <= spec.height);
    assert.ok(image.length <= spec.maxBytes);
    assert.equal(meta.exif, undefined);
  }
});

test('rechaza archivos ajenos, corruptos y cuerpos grandes aun sin Content-Length', async () => {
  await assert.rejects(encodeProfileImage(Buffer.from('<svg/>'), 'avatar'), { status: 415 });
  await assert.rejects(encodeProfileImage(Buffer.from([0xff, 0xd8, 0xff]), 'avatar'), { status: 422 });
  const request = new Request('http://localhost', { method: 'PUT', body: new Uint8Array(PROFILE_IMAGE_INPUT_LIMIT + 1) });
  assert.equal(request.headers.get('content-length'), null);
  await assert.rejects(readProfileImage(request), { status: 413 });
});

const pglite = process.env.PGLITE_MODULE;
const owner = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const bucket = 'anitrack-profile-images';

test('bloquea escrituras directas y solo publica versiones de los dos archivos previstos', { skip: !pglite }, async () => {
  const { PGlite } = require(pglite);
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema storage;
      create table storage.buckets(id text primary key, name text, public bool, file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects(bucket_id text references storage.buckets, name text, version text, updated_at timestamptz default now(), primary key(bucket_id, name));
      alter table storage.objects enable row level security;
      grant usage on schema storage to anon, authenticated;
      grant select, insert, update, delete on storage.objects to anon, authenticated;
      create policy existing_open_policy on storage.objects for all to public using (true) with check (true);
      insert into storage.buckets values ('unrelated', 'unrelated', true, null, null);
    `);
    await db.exec(readFileSync(new URL('../supabase/migrations/202611080002_profile_images.sql', import.meta.url), 'utf8'));
    await db.query('insert into storage.objects(bucket_id, name, version) values ($1,$2,$3), ($1,$4,$5), ($1,$6,$7), ($1,$8,$9)',
      [bucket, `${owner}/avatar.webp`, 'rev1', `${owner}/cover.webp`, 'rev2', `${owner}/extra.webp`, 'hidden', `${other}/avatar.webp`, 'other']);

    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`);
      assert.deepEqual((await db.query('select * from storage.objects')).rows, []);
      await assert.rejects(db.query('insert into storage.objects(bucket_id,name) values ($1,$2)', [bucket, `${other}/cover.webp`]), /row-level security/);
      assert.deepEqual((await db.query('delete from storage.objects where bucket_id = $1 returning name', [bucket])).rows, []);
      assert.deepEqual((await db.query('update storage.objects set version = $2 where bucket_id = $1 returning name', [bucket, 'forged'])).rows, []);
      assert.deepEqual((await db.query('select kind, revision from get_profile_image_versions($1) order by kind', [[owner, owner]])).rows,
        [{ kind: 'avatar', revision: 'rev1' }, { kind: 'cover', revision: 'rev2' }]);
      await db.exec('reset role');
    }
    await db.query('update storage.objects set version = $3 where bucket_id = $1 and name = $2', [bucket, `${owner}/avatar.webp`, 'rev3']);
    assert.deepEqual((await db.query('select kind, revision from get_profile_image_versions($1) order by kind', [[owner]])).rows,
      [{ kind: 'avatar', revision: 'rev3' }, { kind: 'cover', revision: 'rev2' }]);
  } finally {
    await db.close();
  }
});
