import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { safeWatchLink } from '../src/lib/library-editor.ts';

function load(file, dependencies) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(source, { exports, FormData, URL, require(name) {
    if (name in dependencies) return dependencies[name];
    throw Error(name);
  } });
  return exports;
}
const helpers = load('src/lib/hentai.ts', { '@/lib/library-editor': { safeWatchLink } });
const form = (values = {}) => {
  const data = new FormData();
  for (const [key, value] of Object.entries({ title: 'Título con espacios', type: 'anime', image: '', description: 'Mi nota', watch_link: '', ...values })) data.set(key, value);
  return data;
};
function fixture() {
  const initial = [
    { id: '1', user_id: 'owner', title: 'Zeta', type: 'anime', description: 'Nota anterior', image: null, watch_link: null, revision: 'r1', mal_id: null, created_at: '2026-01-01' },
    { id: '2', user_id: 'owner', title: 'Beta', type: 'doujin', description: '', image: null, watch_link: null, revision: 'r1', mal_id: 12, created_at: '2026-03-01' },
    { id: '3', user_id: 'owner', title: 'Alfa', type: 'doujin', description: '', image: null, watch_link: null, revision: 'r1', mal_id: null, created_at: '2026-02-01' },
    { id: '4', user_id: 'other', title: 'Privado ajeno', type: 'anime', description: 'Secreto', image: null, watch_link: null, revision: 'r1', mal_id: null, created_at: '2026-04-01' },
  ];
  const state = { rows: structuredClone(initial), calls: [], sourceCalls: 0, invalidations: [], user: { id: 'owner' }, failure: '', race: false };
  const db = { auth: { getUser: async () => ({ data: { user: state.user } }) }, async rpc(name) {
    state.sourceCalls++;
    if (state.failure === 'sources') return { data: null, error: { message: 'Unavailable' } };
    if (state.failure === 'sources-invalid') return { data: [42], error: null };
    const ownRows = state.rows.filter(row => row.user_id === state.user.id);
    const sources = [...new Set(ownRows.map(row => row.source_anime).filter(Boolean))].sort();
    if (name === 'get_hentai_source_animes') return { data: sources, error: null };
    assert.equal(name, 'get_hentai_filter_options');
    if (state.failure === 'tags-pending') return { data: null, error: { code: 'PGRST202' } };
    return { data: { sources, tags: [...new Set(ownRows.flatMap(row => row.tags ?? []))] }, error: null };
  }, from(table) {
    assert.equal(table, 'hentai');
    const call = { op: 'read', filters: [], orders: [] };
    state.calls.push(call);
    const execute = () => {
      if (call.limit === 0) return { data: [], error: state.failure === 'schema' ? { message: 'Missing columns' } : null };
      if (state.failure === call.op) return { data: null, error: { message: 'Database unavailable' } };
      let rows = state.rows.filter(row => call.filters.every(([key, value]) => row[key] === value));
      if (call.tags) {
        // The fixture decodes the quoted array sent in the PostgREST filter.
        const tags = JSON.parse('[' + call.tags.slice(1, -1) + ']');
        rows = rows.filter(row => tags.every(tag => row.tags?.includes(tag)));
      }
      if (state.race && call.op === 'update') {
        state.rows.find(row => row.id === '1').revision = 'newer';
        rows = [];
      }
      if (call.op === 'insert') state.rows.push({ id: '5', created_at: '2026-05-01', revision: 'r1', mal_id: null, ...call.values });
      if (call.op === 'update') for (const row of rows) Object.assign(row, call.values, { revision: 'r2' });
      if (call.op === 'delete') state.rows = state.rows.filter(row => !rows.includes(row));
      for (const [column, options] of [...call.orders].reverse()) rows.sort((a, b) => String(a[column]).localeCompare(String(b[column])) * (options.ascending ? 1 : -1));
      const count = rows.length;
      if (call.range) rows = rows.slice(call.range[0], call.range[1] + 1);
      return { data: structuredClone(rows), error: null, count };
    };
    const query = {
      select(fields) { call.fields = fields; return query; },
      eq(key, value) { call.filters.push([key, value]); return query; },
      contains(key, value) { assert.equal(key, 'tags'); call.tags = value; return query; },
      limit(value) { call.limit = value; return query; },
      or(value) { call.search = value; return query; },
      order(column, options) { call.orders.push([column, options]); return query; },
      range(from, to) { call.range = [from, to]; return query; },
      insert(values) { call.op = 'insert'; call.values = values; return query; },
      update(values) { call.op = 'update'; call.values = values; return query; },
      delete() { call.op = 'delete'; return query; },
      async maybeSingle() { const result = execute(); return { ...result, data: result.data?.[0] ?? null }; },
      then(resolve, reject) { return Promise.resolve(execute()).then(resolve, reject); },
    };
    return query;
  } };
  const actions = load('src/lib/actions/hentai.ts', {
    '@/lib/supabase/server': { createClient: async () => db },
    'next/cache': { revalidatePath: path => state.invalidations.push(path) },
    '@/lib/hentai': helpers,
  });
  return { state, actions };
}

test('normaliza filtros, entradas anteriores y URLs sin ejecutar contenido externo', () => {
  assert.equal(helpers.parseHentaiFilters({ page: 'NaN', type: 'bad', sort: 'bad' }).page, 1);
  assert.equal(helpers.parseHentaiFilters({ page: '-5' }).page, 1);
  assert.equal(helpers.parseHentaiFilters({ page: ['2'] }).page, 1);
  assert.equal(helpers.parseHentaiFilters({ page: '2', type: 'doujin', sort: 'oldest' }).type, 'doujin');
  assert.ok(helpers.parseHentaiInput(form({ title: '  ' })).error);
  assert.ok(helpers.parseHentaiInput(form({ type: 'manga' })).error);
  for (const field of ['image', 'watch_link']) {
    assert.ok(helpers.parseHentaiInput(form({ [field]: 'javascript:alert(1)' })).error);
    assert.ok(helpers.parseHentaiInput(form({ [field]: 'https://user:password@example.com' })).error);
  }
  assert.equal(helpers.parseHentaiEntry({ id: 1, title: 'Anterior', type: 'doujin', created_at: '2026-01-01', description: 'Mi nota' }).description, 'Mi nota');
  assert.equal(helpers.parseHentaiEntry({ id: 1, title: 'Anterior', type: 'doujin', created_at: '2026-01-01' }).revision, null);
  assert.equal(helpers.parseHentaiEntry({ id: 1, title: 'Anterior', type: 'doujin', created_at: '2026-01-01', mal_id: '12' }).mal_id, 12);
});

test('filtra y ordena antes de paginar, con cantidades del usuario y orden estable', async () => {
  const { actions, state } = fixture();
  let result = await actions.getHentaiEntries(2, 1, '', { type: 'doujin', sort: 'title-asc' });
  assert.equal(result.count, 2);
  assert.equal(result.data[0].title, 'Beta');
  assert.deepEqual(state.calls[0].filters, [['user_id', 'owner'], ['type', 'doujin']]);
  result = await actions.getHentaiEntries(1, 20, '', { sort: 'newest' });
  assert.deepEqual([...result.data].map(row => row.title), ['Beta', 'Alfa', 'Zeta']);
  result = await actions.getHentaiEntries(1, 20, '', { sort: 'oldest' });
  assert.equal(result.data[0].title, 'Zeta');
  await actions.getHentaiEntries(1, 20, 'x,description.eq.(injection)');
  assert.equal(state.calls.at(-1).search.includes(','), true);
  assert.equal(state.calls.at(-1).search.includes('(injection)'), false);
  await actions.getHentaiEntries(1, 20, 'Año en 東京');
  assert.equal(state.calls.at(-1).search, 'title.ilike.%Año%en%東京%,description.ilike.%Año%en%東京%');
});

test('crear y editar guardan solo campos autorizados y conservan ID y fecha de agregado', async () => {
  const { actions, state } = fixture();
  assert.equal((await actions.createHentaiEntry(form({ user_id: 'other', watch_link: 'https://example.test/leer' }))).success, true);
  assert.equal(state.rows.at(-1).user_id, 'owner');
  assert.equal((await actions.updateHentaiEntry('1', 'r1', form({ title: 'Nuevo título', watch_link: 'https://example.test/ver', description: 'Nota nueva' }))).success, true);
  const row = state.rows.find(row => row.id === '1');
  assert.equal(row.description, 'Nota nueva');
  assert.equal(row.created_at, '2026-01-01');
  assert.equal(row.mal_id, null);
  assert.equal(row.revision, 'r2');
  assert.equal(row.watch_link, 'https://example.test/ver');
  assert.ok(state.invalidations.every(path => path === '/hentai'));
});

test('rechaza escrituras ajenas y sin sesión y conserva la identidad de títulos vinculados', async () => {
  const { actions, state } = fixture();
  assert.ok((await actions.updateHentaiEntry('4', 'r1', form())).error);
  assert.equal((await actions.deleteHentaiEntry('4')).success, true);
  assert.equal(state.rows.find(row => row.id === '4').description, 'Secreto');
  assert.ok((await actions.updateHentaiEntry('2', 'r1', form({ type: 'anime' }))).error);
  assert.equal(state.rows.find(row => row.id === '2').type, 'doujin');
  state.user = null;
  state.calls.length = 0;
  assert.ok((await actions.createHentaiEntry(form())).error);
  assert.ok((await actions.updateHentaiEntry('1', 'r1', form())).error);
  assert.ok((await actions.deleteHentaiEntry('1')).error);
  assert.ok((await actions.getHentaiEntries()).error);
  assert.equal(state.calls.length, 0);
  assert.ok((await actions.getHentaiFilterOptions()).sourceError);
  assert.equal(state.sourceCalls, 0);
});

test('clasifica el origen, lo filtra antes de paginar y lista animes de toda la colección privada', async () => {
  const { actions, state } = fixture();
  assert.equal(helpers.parseHentaiEntry(state.rows[0]).source_anime, null);
  assert.equal(helpers.parseHentaiEntry(state.rows[0]).is_original, false);
  assert.equal(helpers.parseHentaiFilters({ origin: 'anime:  Año   en 東京  ' }).origin, 'anime:Año en 東京');
  for (const origin of ['invalid', 'anime: ', 'anime:' + 'x'.repeat(201), ['original']]) assert.equal(helpers.parseHentaiFilters({ origin }).origin, 'all');
  assert.ok(helpers.parseHentaiInput(form({ origin_kind: 'anime', source_anime: ' ' })).error);
  assert.ok(helpers.parseHentaiInput(form({ origin_kind: 'anime', source_anime: 'x'.repeat(201) })).error);
  assert.ok(helpers.parseHentaiInput(form({ origin_kind: 'other' })).error);
  assert.equal((await actions.updateHentaiEntry('1', 'r1', form({ origin_kind: 'anime', source_anime: '  Año   en 東京 ' }))).success, true);
  assert.equal(state.rows[0].source_anime, 'Año en 東京');
  assert.equal(state.rows[0].is_original, false);
  assert.equal((await actions.updateHentaiEntry('2', 'r1', form({ type: 'doujin', origin_kind: 'original', source_anime: 'Ignorado' }))).success, true);
  assert.equal(state.rows[1].source_anime, null);
  assert.equal(state.rows[1].is_original, true);
  state.rows[2].source_anime = 'Lucky*Star, 100%_';
  state.rows[3].source_anime = 'Anime privado ajeno';
  let result = await actions.getHentaiEntries(1, 1, '', { origin: 'original', type: 'doujin' });
  assert.equal(result.count, 1);
  assert.equal(result.data[0].id, '2');
  result = await actions.getHentaiEntries(1, 1, '', { origin: 'anime:Lucky*Star, 100%_' });
  assert.equal(result.count, 1);
  assert.equal(result.data[0].id, '3');
  const options = await actions.getHentaiFilterOptions();
  assert.deepEqual([...options.sources], ['Año en 東京', 'Lucky*Star, 100%_']);
  state.failure = 'tags-pending';
  const fallback = await actions.getHentaiFilterOptions();
  assert.ok(fallback.tagError);
  assert.deepEqual([...fallback.sources], [...options.sources]);
  state.failure = '';
  assert.equal((await actions.updateHentaiEntry('1', 'r2', form({ origin_kind: 'original' }))).success, true);
  assert.equal(state.rows[0].source_anime, null);
  assert.equal(state.rows[0].is_original, true);
  assert.equal((await actions.createHentaiEntry(form({ origin_kind: 'anime', source_anime: 'Nuevo anime' }))).success, true);
  assert.equal(state.rows.at(-1).source_anime, 'Nuevo anime');
  assert.equal(state.rows.at(-1).is_original, false);
  state.failure = 'sources';
  assert.ok((await actions.getHentaiFilterOptions()).sourceError);
  state.failure = 'sources-invalid';
  assert.ok((await actions.getHentaiFilterOptions()).sourceError);
});

test('guarda etiquetas válidas y filtra por todas antes de paginar', async () => {
  const { actions, state } = fixture();
  const input = form();
  for (const tag of ['  ACCIÓN  ', 'acción', 'a, "b" \\ c']) input.append('tag', tag);
  assert.equal((await actions.updateHentaiEntry('1', 'r1', input)).success, true);
  assert.deepEqual([...state.rows[0].tags], ['acción', 'a, "b" \\ c']);
  state.rows[1].tags = ['acción'];
  state.rows[2].tags = ['otra'];
  state.rows[3].tags = ['privada', 'acción', 'a, "b" \\ c'];
  const filtered = await actions.getHentaiEntries(1, 1, '', { tags: ['ACCIÓN', 'a, "b" \\ c'] });
  assert.equal(filtered.count, 1);
  assert.equal(filtered.data[0].id, '1');
  assert.deepEqual([...(await actions.getHentaiFilterOptions()).tags].sort(), ['a, "b" \\ c', 'acción', 'otra']);
  const invalid = form();
  invalid.append('tag', 'z'.repeat(61));
  assert.ok((await actions.updateHentaiEntry('1', 'r2', invalid)).error);
  assert.equal((await actions.updateHentaiEntry('1', 'r2', form())).success, true);
  assert.deepEqual([...state.rows[0].tags], []);
});

test('un conflicto o fallo conserva datos; quitar es idempotente y los errores no parecen colección vacía', async () => {
  const { actions, state } = fixture();
  state.race = true;
  assert.ok((await actions.updateHentaiEntry('1', 'r1', form({ description: 'Pisar edición' }))).error);
  assert.equal(state.rows[0].description, 'Nota anterior');
  state.race = false;
  state.failure = 'update';
  assert.ok((await actions.updateHentaiEntry('1', 'newer', form())).error);
  assert.equal(state.rows[0].description, 'Nota anterior');
  state.failure = 'schema';
  assert.ok((await actions.createHentaiEntry(form())).error);
  state.failure = 'read';
  assert.ok((await actions.getHentaiEntries()).error);
  state.failure = 'delete';
  assert.ok((await actions.deleteHentaiEntry('1')).error);
  assert.equal(state.rows.length, 4);
  state.failure = '';
  assert.equal((await actions.deleteHentaiEntry('1')).success, true);
  assert.equal((await actions.deleteHentaiEntry('1')).success, true);
  assert.equal(state.rows.length, 3);
});
