import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOptions, parseTitleResponse, createTitleReader, missingTitlePatch, applyMissingTitles, backfillMediaTitles } from '../scripts/backfill-media-titles.mjs';

const response = (idMal = 37786, type = 'ANIME', english = 'Bloom Into You') => ({ data: { Page: { media: [{ idMal, type, title: { english, romaji: 'Yagate Kimi ni Naru' } }] } } });
test('la vista previa es el modo por defecto y los argumentos de reanudación se validan', () => {
  assert.equal(parseOptions([]).apply, false);
  assert.equal(parseOptions(['--apply', '--limit=25']).limit, 25);
  for (const args of [['--limit=0'], ['--after=bad'], ['--force'], ['--limit=1.5']]) assert.throws(() => parseOptions(args));
});
test('no confunde ID AniList con ID MAL, ni anime con manga, y rechaza respuestas parciales o ambiguas', () => {
  for (const payload of [response(101), response(37786, 'MANGA'), { errors: [{}], ...response() }, { data: {} }, { data: { Page: { media: [...response().data.Page.media, ...response().data.Page.media] } } }]) assert.throws(() => parseTitleResponse(payload, 'anime', [37786]));
  assert.equal(parseTitleResponse(response(37786, 'ANIME', null), 'anime', [37786]).get(37786).title_english, null);
});
test('respeta Retry-After y el cooldown entre tandas; limita reintentos de fallos remotos', async () => {
  let time = 0, calls = 0;
  const waits = [];
  const read = createTitleReader({ now: () => time, pause: async ms => { waits.push(ms); time += ms; }, fetcher: async () => {
    calls++;
    return calls === 1 ? new Response('', { status: 429, headers: { 'Retry-After': '90' } }) : Response.json(response());
  } });
  await read('anime', [37786]); await read('anime', [37786]);
  assert.equal(calls, 3); assert.ok(waits[0] >= 90000); assert.ok(waits[1] >= 5000);
  calls = 0;
  const broken = createTitleReader({ now: () => time, pause: async ms => { time += ms; }, fetcher: async () => { calls++; return new Response('', { status: 503 }); } });
  await assert.rejects(broken('anime', [37786])); assert.equal(calls, 4);
});
test('completar variantes nunca sustituye title ni un alias existente, incluidos cambios concurrentes', async () => {
  const row = { id: 'm1', mal_id: 37786, type: 'anime', title: 'Nombre visible', title_english: null, title_romaji: 'Nombre conservado' };
  const patch = missingTitlePatch(row, { title_english: 'Bloom Into You', title_romaji: 'Otro' });
  assert.deepEqual(patch, { title_english: 'Bloom Into You' });
  const updates = [], conditions = [];
  const db = { from(table) { assert.equal(table, 'media'); const q = { update(value) { updates.push(value); return q; }, eq(key, value) { conditions.push([key, value]); return q; }, is(key, value) { conditions.push([key, value]); return q; }, select: async () => ({ data: [], error: null }) }; return q; } };
  assert.equal(await applyMissingTitles(db, row, patch), false);
  assert.deepEqual(updates, [{ title_english: 'Bloom Into You' }]);
  assert.deepEqual(conditions, [['id', 'm1'], ['mal_id', 37786], ['type', 'anime'], ['title_english', null]]);
});

function fixture() {
  const rows = [{ id: '1', mal_id: 37786, type: 'anime', title: 'Visible', title_english: null, title_romaji: null }, { id: '2', mal_id: 37786, type: 'manga', title: 'Manga', title_english: null, title_romaji: null }];
  let writes = 0;
  const db = { from() {
    let take = 25, after = null, update = null;
    const conditions = [];
    const run = () => {
      if (update) {
        const row = rows.find(row => conditions.every(([key, value]) => row[key] === value));
        if (row) { Object.assign(row, update); writes++; }
        return { data: row ? [{ id: row.id }] : [], error: null };
      }
      return { data: rows.filter(row => (!after || row.id > after) && (row.title_english == null || row.title_romaji == null)).slice(0, take), error: null };
    };
    const q = { select() { return q; }, in() { return q; }, or() { return q; }, order() { return q; }, limit(n) { take = n; return q; }, gt(key, value) { after = value; return q; }, update(values) { update = values; return q; }, eq(key, value) { conditions.push([key, value]); return q; }, is(key, value) { conditions.push([key, value]); return q; }, then(resolve) { return Promise.resolve(run()).then(resolve); } };
    return q;
  } };
  return { db, rows, get writes() { return writes; } };
}
test('el proceso completo es paginado, separa tipos, no escribe en vista previa y es idempotente al aplicar', async () => {
  const f = fixture(), calls = [];
  const deps = { log() {}, readTitles: async (type, ids) => { calls.push([type, ids]); return new Map([[37786, { title_english: 'Bloom Into You', title_romaji: 'Yagate Kimi ni Naru' }]]); } };
  const preview = await backfillMediaTitles(f.db, parseOptions(['--limit=1']), deps);
  assert.equal(preview.candidates, 1); assert.equal(f.writes, 0); assert.equal(preview.scanned, 1);
  await backfillMediaTitles(f.db, parseOptions(['--apply']), deps);
  assert.equal(f.writes, 4); assert.equal(f.rows[0].title, 'Visible'); assert.equal(f.rows[1].title, 'Manga');
  assert.deepEqual(calls.map(c => c[0]), ['anime', 'anime', 'manga']);
  const repeated = await backfillMediaTitles(f.db, parseOptions(['--apply']), deps);
  assert.equal(repeated.scanned, 0); assert.equal(f.writes, 4);
});
test('un proveedor caído o una obra ausente no borra datos, y --after permite reanudar', async () => {
  const f = fixture();
  await assert.rejects(backfillMediaTitles(f.db, parseOptions(['--apply']), { log() {}, readTitles: async () => { throw Error('offline'); } }));
  assert.equal(f.writes, 0);
  const missing = await backfillMediaTitles(f.db, { ...parseOptions([]), after: '1' }, { log() {}, readTitles: async () => new Map() });
  assert.equal(missing.scanned, 1); assert.equal(missing.unmatched, 1); assert.equal(f.writes, 0);
});
