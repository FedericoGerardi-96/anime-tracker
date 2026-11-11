import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as search from '../src/lib/library-search.ts';
import * as filters from '../src/lib/library-filters.ts';
import { cleanMediaTitles } from '../src/lib/media-titles.ts';
import * as syncPolicy from '../src/lib/anilist-sync-policy.ts';

function load(file, mocks = {}, append = '') {
  const loaded = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8') + append, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { module: loaded, exports: loaded.exports, Date, console, process, Error, AbortSignal, require(name) {
    if (name === 'server-only') return {};
    if (name in mocks) return mocks[name];
    throw new Error(`Unexpected dependency: ${name}`);
  } });
  return loaded.exports;
}
const collection = load('src/lib/favorite-collection.ts', { './library-filters': filters, './library-search': search });
const media = { id: 'm1', mal_id: 37786, type: 'anime', title: 'Bloom Into You', title_english: 'Bloom Into You', title_romaji: 'Yagate Kimi ni Naru', image: '', season: '', genres: [], score: 8 };
const favorite = { id: 'f1', media, user_metadata: { custom_description: 'Para el finde', custom_tags: ['amistad'] } };

test('la biblioteca encuentra ambos idiomas, normaliza mayúsculas y conserva nota/etiquetas y paginación', () => {
  for (const query of ['YAGATE kimi ni naru', 'Bloom Into You', 'finde', 'amistad']) {
    const result = collection.selectFavoritePage([{ ...favorite, id: 'other', media: { ...media, title: 'Otro', title_romaji: null, title_english: null }, user_metadata: null }, favorite], { query, page: 1, pageSize: 1 });
    assert.equal(result.totalCount, 1); assert.equal(result.favorites[0].media.title, 'Bloom Into You');
  }
  assert.equal(collection.selectFavoritePage([favorite], { query: 'Yagate', page: 2, pageSize: 1 }).favorites.length, 0);
  assert.equal(collection.selectFavoritePage([favorite], { query: 'Yagate', mediaType: 'manga' }).totalCount, 0);
  assert.equal(collection.selectFavoritePage([{ ...favorite, media: { ...media, title_romaji: null, title_english: null } }], { query: 'Bloom' }).totalCount, 1);
});

test('las variantes opcionales se validan sin inventar una traducción ni aceptar otros campos', () => {
  assert.deepEqual(cleanMediaTitles({ title_romaji: ' Yagate Kimi ni Naru ', title_english: null, title: 'No reemplazar' }), { title_romaji: 'Yagate Kimi ni Naru' });
  for (const input of [null, 'texto', { title_english: 8, title_romaji: [] }, { title_english: ' ', title_romaji: 'x'.repeat(501) }]) assert.deepEqual(cleanMediaTitles(input), {});
});

test('estados y colecciones buscan por romaji antes de paginar, incluso con RPC antiguos activados', async () => {
  let owner;
  const api = load('src/services/lists-page.ts', {
    './supabase': { getAuthenticatedUser: async () => ({ id: 'owner' }), getSupabaseServer: async () => ({ rpc() { throw Error('Legacy RPC must not handle title searches'); }, from() {
      const q = { select() { return q; }, eq(key, value) { if (key === 'user_id') owner = value; return q; }, maybeSingle: async () => ({ data: { id: '00000000-0000-0000-0000-000000000001', name: 'Colección' }, error: null }) }; return q;
    } }) },
    '@/lib/actions/lists': { getMediaByProgressStatus: async () => [{ id: 'f1', media, status: 'watching' }], getListMedia: async () => [{ id: 'f1', media }], getLists: async () => ({ data: [], error: null }) },
    '@/lib/library-filters': filters, '@/lib/library-search': search,
  });
  const before = process.env.LISTS_RPC_ENABLED;
  process.env.LISTS_RPC_ENABLED = 'true';
  try {
    for (const options of [{ tab: 'watching' }, { tab: 'custom_lists', listId: '00000000-0000-0000-0000-000000000001' }]) {
      const data = await api.getListsPageData({ ...options, query: 'Yagate', page: 1, pageSize: 12 });
      assert.equal(data.totalCount, 1); assert.equal(data.items[0].media.title, 'Bloom Into You');
    }
    assert.equal(owner, 'owner');
  } finally { if (before === undefined) delete process.env.LISTS_RPC_ENABLED; else process.env.LISTS_RPC_ENABLED = before; }
});

test('biblioteca completa busca variantes con RPC activados y mantiene la identidad del usuario', async () => {
  const api = load('src/services/favorites-page.ts', {
    '@/lib/favorite-collection': collection, '@/lib/library-filters': filters,
    '@/services/supabase': { getAuthenticatedUser: async () => ({ id: 'owner' }), getSupabaseServer: async () => { throw Error('No RPC for alias search'); } },
    '@/services/favorites': { getAllFavoritesFull: async id => { assert.equal(id, 'owner'); return [favorite]; } },
  });
  const before = process.env.FAVORITES_RPC_ENABLED;
  process.env.FAVORITES_RPC_ENABLED = 'true';
  try { assert.equal((await api.getFavoritesPageData('owner', { query: 'Yagate' })).totalCount, 1); }
  finally { if (before === undefined) delete process.env.FAVORITES_RPC_ENABLED; else process.env.FAVORITES_RPC_ENABLED = before; }
  await assert.rejects(api.getFavoritesPageData('other', { query: 'Yagate' }), /No autorizado/);
});

function mutationFixture(authenticated = true) {
  const state = { media: null, writes: [], remoteCalls: 0 };
  const db = { auth: { getUser: async () => ({ data: { user: authenticated ? { id: 'owner' } : null } }) }, from(table) {
    let op = 'read', values;
    const run = () => {
      if (op !== 'read') { state.writes.push({ table, op, values }); if (table === 'media') state.media = { id: 'm1', ...values }; }
      return { error: null, data: table === 'media' ? state.media : table === 'favorites' ? null : [] };
    };
    const q = { select() { return q; }, eq() { return q; }, in() { return q; }, limit() { return q; }, order() { return q; },
      insert(v) { op = 'insert'; values = v; return q; }, upsert(v) { op = 'upsert'; values = v; return q; }, delete() { op = 'delete'; return q; },
      single: async () => run(), maybeSingle: async () => run(), then(resolve) { return Promise.resolve(run()).then(resolve); } };
    return q;
  } };
  const mocks = { '@/lib/supabase/server': { createClient: async () => db }, '@/services/supabase': { getAuthenticatedUser: async () => authenticated ? { id: 'owner' } : null },
    '@/services/favorites': {}, '@/lib/read-all-pages': {}, '@/lib/media-titles': { cleanMediaTitles }, 'next/cache': { revalidatePath() {} } };
  return { state, favorite: load('src/lib/actions/media.ts', mocks), lists: load('src/lib/actions/lists.ts', mocks) };
}

test('guardar manualmente por favorito o lista persiste las variantes sin consultar proveedores', async () => {
  for (const method of ['favorite', 'lists']) {
    const fixture = mutationFixture();
    const input = { ...media, type: 'anime' };
    const result = method === 'favorite' ? await fixture.favorite.toggleFavorite(input) : await fixture.lists.addMediaToLists(input, []);
    assert.equal(result.success, true);
    assert.equal(fixture.state.media.title, 'Bloom Into You');
    assert.equal(fixture.state.media.title_english, 'Bloom Into You'); assert.equal(fixture.state.media.title_romaji, 'Yagate Kimi ni Naru');
    assert.ok(fixture.state.writes.filter(w => w.table === 'favorites' || w.table === 'user_media_progress').every(w => w.values.user_id === 'owner'));
  }
});

test('sin sesión no guarda catálogo ni favoritos, y un registro existente conserva sus nombres', async () => {
  const absent = mutationFixture(false);
  assert.ok((await absent.favorite.toggleFavorite(media)).error); assert.ok((await absent.lists.addMediaToLists(media, [])).error); assert.equal(absent.state.writes.length, 0);
  const existing = mutationFixture(); existing.state.media = { ...media };
  await existing.favorite.toggleFavorite({ ...media, title_english: undefined, title_romaji: undefined });
  assert.equal(existing.state.media.title_romaji, 'Yagate Kimi ni Naru'); assert.equal(existing.state.writes.some(w => w.table === 'media'), false);
});

test('importar incorpora los títulos de AniList y respeta cambios pendientes', async () => {
  const writes = [];
  let queued = false;
  const db = { from(table) {
    let operation, values;
    const result = () => {
      if (operation) writes.push({ table, values });
      return { error: null, data: table === 'library_sync_pending' ? (queued ? [{}] : []) : table === 'media' ? { id: 'm1', title_english: 'Conservado', title_romaji: null } : table === 'favorites' ? [{ id: 'f1' }] : null };
    };
    const q = { select() { return q; }, eq() { return q; }, is() { return q; }, limit() { return q; }, upsert(v) { operation = 'upsert'; values = v; return q; }, update(v) { operation = 'update'; values = v; return q; }, single: async () => result(), maybeSingle: async () => result(), then(resolve) { return Promise.resolve(result()).then(resolve); } };
    return q;
  } };
  const api = load('src/services/anilist-sync.ts', { '@/services/pending-library-sync': {}, '@/services/sync-lease': {}, 'node:crypto': {}, '@/lib/supabase/admin': {}, '@/lib/anilist-token-crypto': {}, '@/lib/media-titles': { cleanMediaTitles },
    '@/lib/anilist-sync-policy': { localStatus: () => 'watching', reconcileAniListProgress: () => 'local' },
  }, '\nexports.importEntryForTest = importEntry;');
  const entry = { status: 'CURRENT', progress: 3, media: { id: 101, idMal: 37786, type: 'ANIME', title: { english: 'Bloom Into You', romaji: 'Yagate Kimi ni Naru' }, coverImage: { large: '' }, episodes: 13 } };
  const job = { user_id: 'owner', state: { types: ['anime'], typeIndex: 0, imported: 0 } };
  await api.importEntryForTest(db, job, entry);
  assert.equal(writes.find(w => w.table === 'media').values.title_romaji, 'Yagate Kimi ni Naru');
  assert.equal(writes.find(w => w.table === 'media').values.title_english, 'Bloom Into You');
  writes.length = 0;
  await api.importEntryForTest(db, job, entry, 'm1');
  const metadataWrites = writes.filter(w => w.table === 'media');
  assert.equal(metadataWrites.length, 1); assert.deepEqual(Object.keys(metadataWrites[0].values), ['title_romaji']);
  writes.length = 0; queued = true;
  await api.importEntryForTest(db, job, entry); assert.equal(writes.length, 0);
});

test('los adaptadores de catálogo conservan ambos títulos sin agregar consultas', async () => {
  let calls = 0;
  const provider = { providerRead: async () => {
    calls++;
    return { data: { Page: { media: [{ id: 101, idMal: 37786, title: { english: 'Bloom Into You', romaji: 'Yagate Kimi ni Naru' } }], pageInfo: { lastPage: 1, hasNextPage: false } } } };
  }, ProviderRequestError: Error };
  const catalog = load('src/services/anilist-catalog.ts', { '@/services/provider-request': provider });
  const item = (await catalog.getAniListCatalog('anime', {})).items[0];
  assert.equal(item.title, 'Bloom Into You'); assert.equal(item.title_romaji, 'Yagate Kimi ni Naru'); assert.equal(item.title_english, 'Bloom Into You'); assert.equal(calls, 1);
  const mal = load('src/lib/myanimelist-service.ts', { '@/services/provider-request': provider });
  const raw = { id: 37786, title: 'Yagate Kimi ni Naru', alternative_titles: { en: 'Bloom Into You' } };
  for (const mapped of [mal.mapMalAnimeToCard(raw), mal.mapMalAnimeToCatalog(raw), mal.mapMalMangaToCatalog(raw)]) {
    assert.equal(mapped.title_english, 'Bloom Into You'); assert.equal(mapped.title_romaji, 'Yagate Kimi ni Naru');
  }
  assert.equal(mal.mapMalAnimeToCard({ ...raw, alternative_titles: {} }).title_english, null);
  assert.equal(calls, 1);
});

test('la importación de MAL lleva inglés y título original al mismo contrato de persistencia', async () => {
  const api = load('src/services/anilist-sync.ts', { '@/services/pending-library-sync': {}, '@/services/sync-lease': {}, 'node:crypto': {}, '@/lib/supabase/admin': {}, '@/lib/anilist-token-crypto': {}, '@/lib/media-titles': { cleanMediaTitles }, '@/lib/anilist-sync-policy': syncPolicy,
    '@/services/myanimelist-library': { getMalSyncPage: async () => ({ data: [{ node: { id: 37786, title: 'Yagate Kimi ni Naru', alternative_titles: { en: 'Bloom Into You' } }, list_status: { status: 'watching', num_episodes_watched: 3, updated_at: '2026-11-11T00:00:00Z' } }], paging: {} }) },
  }, '\nexports.advanceForTest = advance;');
  const job = { provider: 'myanimelist', state: { phase: 'fetch', types: ['anime'], typeIndex: 0, page: 1, remote: [] } };
  await api.advanceForTest({}, job, { token: 'test' }, { delay: 0 });
  const entry = job.state.remote[0];
  assert.equal(entry.media.idMal, 37786); assert.equal(entry.media.title.english, 'Bloom Into You'); assert.equal(entry.media.title.romaji, 'Yagate Kimi ni Naru');
});
