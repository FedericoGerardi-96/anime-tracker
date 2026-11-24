import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function load(file, dependencies) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(source, { exports, URL, Date, Map, Set, require(name) {
    if (name in dependencies) return dependencies[name];
    throw new Error(name);
  } });
  return exports;
}
const editor = load('src/lib/library-editor.ts', {});
const helpers = load('src/lib/library-export.ts', { './library-editor': editor });
const paging = load('src/lib/read-all-pages.ts', {});

function fixture() {
  const rows = {
    favorites: [{ id: 'f1', media_id: 'm1', user_id: 'owner', created_at: '2026-01-01' }, { id: 'f2', media_id: 'm2', user_id: 'owner', created_at: '2026-01-02' }, { id: 'f3', media_id: 'foreign', user_id: 'other' }],
    user_media_progress: [{ id: 'p1', media_id: 'm1', user_id: 'owner', status: 'completed', current_episode: 12, custom_description: 'Nota personal', custom_tags: ['Amigos'], watch_link: 'https://example.test/ver', updated_at: '2026-02-01' }, { id: 'p2', media_id: 'm3', user_id: 'owner', status: 'watching', current_episode: 0 }, { id: 'p3', media_id: 'foreign', user_id: 'other', custom_description: 'Privado' }],
    list_media: [{ id: 'l1', media_id: 'm1', lists: { id: 'list1', name: 'Mis preferidos', user_id: 'owner' } }, { id: 'l2', media_id: 'm4', created_at: '2026-01-04', lists: { id: 'list1', name: 'Mis preferidos', user_id: 'owner' } }, { id: 'l3', media_id: 'foreign', lists: { id: 'other-list', name: 'Ajeno', user_id: 'other' } }],
    media: Array.from({ length: 4 }, (_, i) => ({ id: `m${i + 1}`, mal_id: 100 + i, title: ['Alfa', 'Beta', 'Manga sin favorito', 'Solo en colección'][i], type: i === 2 ? 'manga' : 'anime', score: i === 1 ? 0 : null, image: 'https://example.test/cover.jpg', total_units: i === 2 ? null : 12 })),
    hentai: [{ id: 'h1', user_id: 'owner', title: 'Manual', type: 'doujin', description: 'Mi nota', source_anime: 'Naruto', watch_link: 'https://example.test/leer', tags: ['acción', 'aventura'] }, { id: 'h2', user_id: 'owner', title: 'Original', type: 'anime', is_original: true }, { id: 'h3', user_id: 'other', title: 'Privado', type: 'anime' }],
  };
  const state = { user: { id: 'owner' }, rows, calls: [], failure: '' };
  const db = { auth: { getUser: async () => ({ data: { user: state.user }, error: null }) }, from(table) {
    const call = { table, filters: [], range: [0, 1] }; state.calls.push(call);
    const query = {
      select(fields) { call.fields = fields; return query; },
      eq(key, value) { call.filters.push([key, value]); return query; },
      in(key, values) { call.in = [key, values]; return query; },
      order(key) { call.order = key; return query; },
      range(from, to) { call.range = [from, Math.min(to, from + 1)]; return query; },
      then(resolve, reject) {
        let result = state.rows[table].filter(row => call.filters.every(([key, value]) => key === 'lists.user_id' ? row.lists.user_id === value : row[key] === value));
        if (call.in) result = result.filter(row => call.in[1].includes(row[call.in[0]]));
        if (!call.in) result = [...result].sort((a, b) => a.id.localeCompare(b.id)).slice(call.range[0], call.range[1] + 1);
        return Promise.resolve({ data: state.failure === table ? null : result, error: state.failure === table ? { message: 'Failure' } : null }).then(resolve, reject);
      },
    };
    return query;
  } };
  const service = load('src/services/library-export.ts', { 'server-only': {}, '@/lib/supabase/server': { createClient: async () => db }, '@/lib/read-all-pages': paging, '@/lib/library-export': helpers, '@/lib/library-editor': editor });
  return { state, service };
}

test('exporta la colección completa, deduplica y conserva notas/progreso, cero y ausencias', async () => {
  const { state, service } = fixture();
  const result = await service.readLibraryExport('library');
  assert.equal(result.rows.length, 4);
  assert.deepEqual([...result.rows].map(row => row.id).sort(), ['m1', 'm2', 'm3', 'm4']);
  const first = result.rows.find(row => row.id === 'm1');
  assert.equal(first.note, 'Nota personal'); assert.equal(first.status, 'Completado'); assert.equal(first.progress, 12);
  assert.equal(first.collections, 'Mis preferidos'); assert.equal(first.created, '2026-01-01');
  assert.equal(result.rows.find(row => row.id === 'm2').score, 0);
  const manga = result.rows.find(row => row.id === 'm3');
  assert.equal(manga.status, 'Leyendo'); assert.equal(manga.progress, 0); assert.equal(manga.created, null); assert.equal(manga.total, null);
  for (const call of state.calls.filter(call => call.table !== 'media')) {
    assert.ok(call.filters.some(([key, value]) => (key === 'user_id' || key === 'lists.user_id') && value === 'owner'));
    assert.equal(call.order, 'id');
  }
  assert.ok(state.calls.some(call => call.range[0] === 2));
});

test('Hentai conserva registros originales y manuales y no mezcla otras cuentas', async () => {
  const { service } = fixture();
  const result = await service.readLibraryExport('hentai');
  assert.equal(result.rows.length, 2); assert.equal(result.rows[0].origin, 'Naruto'); assert.equal(result.rows[1].origin, 'Original');
  assert.equal(result.rows[0].note, 'Mi nota'); assert.equal(result.rows[0].link, 'https://example.test/leer');
  assert.equal(result.rows[0].tags, 'acción, aventura');
  assert.equal(result.rows[1].tags, null);
  assert.equal(helpers.parseExportDataset(result, 'hentai').rows[0].tags, 'acción, aventura');
  assert.ok(!('status' in result.rows[0]));
});

test('no consulta datos sin sesión y un fallo o metadata faltante impide un archivo parcial', async () => {
  const { state, service } = fixture(); state.user = null;
  assert.equal(await service.readLibraryExport('library'), null); assert.equal(state.calls.length, 0);
  state.user = { id: 'owner' }; state.failure = 'user_media_progress';
  await assert.rejects(service.readLibraryExport('library'));
  state.failure = ''; state.rows.media = state.rows.media.filter(row => row.id !== 'm3');
  await assert.rejects(service.readLibraryExport('library'), /incompleto/);
});

test('valida datos, selección y orden sin fórmulas ni URLs ejecutables', () => {
  assert.deepEqual([...helpers.moveExportField(['title', 'note', 'score'], 'score', 'title')], ['score', 'title', 'note']);
  assert.equal(helpers.validExportSettings({ fields: [], theme: 'estreno' }, 'library'), false);
  assert.equal(helpers.validExportSettings({ fields: ['title', 'title'], theme: 'estreno' }, 'library'), false);
  assert.equal(helpers.validExportSettings({ fields: ['score'], theme: 'estreno' }, 'hentai'), false);
  assert.equal(helpers.validExportSettings({ fields: ['title'], theme: 'unknown' }, 'library'), false);
  assert.throws(() => helpers.parseExportDataset({ source: 'library', rows: [{ id: '1', title: 'X', score: {} }] }, 'library'));
  assert.equal(helpers.exportCell({ link: 'javascript:alert(1)' }, { key: 'link' }), null);
  assert.equal(helpers.exportCell({ created: 'bad date' }, { key: 'created', date: true }), null);
});

test('el endpoint exige origen válido, sesión y respuestas privadas sin caché', async () => {
  const state = { calls: 0, result: null, failure: false };
  const route = load('src/app/api/library/export/route.ts', { 'next/server': { NextResponse: { json: (data, init) => ({ data, ...init }) } }, '@/services/library-export': { readLibraryExport: async () => { state.calls++; if (state.failure) throw new Error('db'); return state.result; } } });
  const request = source => ({ nextUrl: new URL(`https://example.test/api/library/export?source=${source}`) });
  assert.equal((await route.GET(request('other'))).status, 400); assert.equal(state.calls, 0);
  assert.equal((await route.GET(request('library'))).status, 401);
  state.result = { source: 'library', rows: [] };
  const success = await route.GET(request('library'));
  assert.equal(success.headers['Cache-Control'], 'private, no-store'); assert.equal(success.headers.Vary, 'Cookie');
  state.failure = true; assert.equal((await route.GET(request('hentai'))).status, 500);
});
