import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAnimeRelations } from '../src/lib/anime-relations.ts';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { readInBatches } from '../src/lib/read-all-pages.ts';

const edge = (idMal, type = 'ANIME') => ({ relationType: 'SEQUEL', node: { id: 999, idMal, type, title: { romaji: 'Serie' }, format: 'OVA', coverImage: { large: 'https://s4.anilist.co/cover.jpg' } } });
test('usa ID MAL, excluye manga, IDs ausentes, el título actual y duplicados', () => {
  const items = parseAnimeRelations({ edges: [edge(2), edge(2), edge(null), edge(1), edge(3, 'MANGA'), null, edge(-1)] }, 1);
  assert.equal(items.length, 1); assert.equal(items[0].malId, 2); assert.equal(items[0].relation, 'Secuela');
  assert.deepEqual(parseAnimeRelations(null, 1), []);
});
test('descarta imágenes externas y conserva la ficha sin portada', () => {
  const item = edge(2); item.node.coverImage.large = 'https://example.org/image.jpg';
  assert.equal(parseAnimeRelations({ edges: [item] }, 1)[0].image, '');
});
test('consulta estados por usuario, tipo anime e IDs de la tanda; sin sesión no consulta datos', async () => {
  let user = { id: 'owner' }; const calls = [];
  const q = { select: () => q, eq: (k,v) => { calls.push([k,v]); return q; }, in: (k,v) => { calls.push([k,v]); return q; }, then: resolve => Promise.resolve({ data: [{ status: 'completed', media: { mal_id: 2 } }], error: null }).then(resolve) };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/related-anime.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, require(name) {
      if (name === 'server-only') return {};
      if (name === '@/services/supabase') return { getAuthenticatedUser: async () => user, getSupabaseServer: async () => ({ from: () => q }) };
      if (name === '@/lib/read-all-pages') return { readInBatches: async (ids, read) => (await read(ids)).data };
      if (name === '@/lib/library-editor') return { libraryStatuses: [{ value: 'completed' }] };
      throw Error(name);
    },
  });
  const result = await exports.getRelatedAnimeStatuses([2,3]);
  assert.equal(result.get(2), 'completed');
  assert.deepEqual(calls, [['user_id','owner'],['media.type','anime'],['media.mal_id',[2,3]]]);
  calls.length = 0; user = null; assert.equal((await exports.getRelatedAnimeStatuses([2])).size, 0); assert.equal(calls.length, 0);
});

test('los estados del catálogo respetan sesión y tipo, agrupan IDs y rechazan estados desconocidos', async () => {
  const calls = [];
  let user = { id: 'owner' };
  let failure = false;
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/related-anime.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports,
    require(name) {
      if (name === 'server-only') return {};
      if (name === '@/lib/read-all-pages') return { readInBatches };
      if (name === '@/lib/library-editor') return { libraryStatuses: [{ value: 'watching' }, { value: 'completed' }] };
      if (name === '@/services/supabase') return {
        getAuthenticatedUser: async () => user,
        getSupabaseServer: async () => ({ from(table) {
          const call = { table, filters: {} };
          calls.push(call);
          const query = {
            select: () => query,
            eq(key, value) { call.filters[key] = value; return query; },
            in(key, values) { call.filters[key] = values; return query; },
            then(resolve) {
              return Promise.resolve({ data: [
                { status: 'watching', media: [{ mal_id: call.filters['media.mal_id'][0] }] },
                { status: 'unknown', media: { mal_id: 999 } },
              ], error: failure ? { message: 'No se pudo leer el progreso' } : null }).then(resolve);
            },
          };
          return query;
        } }),
      };
      throw Error(name);
    },
  });
  const ids = Array.from({ length: 101 }, (_, i) => i + 1);
  const states = await exports.getMediaLibraryStatuses('manga', [...ids, 1]);
  assert.equal(calls.length, 2);
  assert.equal(states.get(1), 'watching');
  assert.equal(states.get(101), 'watching');
  assert.equal(states.has(999), false);
  assert.deepEqual(calls.map(call => call.filters['media.mal_id'].length), [100, 1]);
  assert.ok(calls.every(call => call.table === 'user_media_progress' && call.filters.user_id === 'owner' && call.filters['media.type'] === 'manga'));
  calls.length = 0;
  user = null;
  assert.equal((await exports.getMediaLibraryStatuses('manga', ids)).size, 0);
  assert.equal(calls.length, 0);
  user = { id: 'other' };
  failure = true;
  await assert.rejects(exports.getMediaLibraryStatuses('anime', [1]), /No se pudo leer el progreso/);
  assert.equal(calls[0].filters.user_id, 'other');
  assert.equal(calls[0].filters['media.type'], 'anime');
});
