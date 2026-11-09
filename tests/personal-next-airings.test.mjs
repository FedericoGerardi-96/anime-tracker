import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { parsePersonalNextAirings } from '../src/lib/home-airing.ts';

function personalService(providerRead) {
  const source = ts.transpileModule(fs.readFileSync('src/services/home-personal-schedule.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    require(name) {
      if (name === '@/services/provider-request') return { providerRead };
      if (name === '@/lib/home-airing') return { parsePersonalNextAirings };
      if (['server-only', '@/services/supabase', '@/services/favorites', '@/services/home-public-schedule'].includes(name)) return {};
      throw new Error(`Unexpected import ${name}`);
    },
  });
  return exports.getPersonalNextAirings;
}

function resultFor(query) {
  const ids = [...query.matchAll(/media\(idMal: (\d+)/g)].map((match) => Number(match[1]));
  // Reproduce the provider rejection found with the real selection of fields.
  if (ids.length * 13 > 500) throw new Error('Max query complexity should be 500');
  return { ids, response: { data: Object.fromEntries(ids.map((id, index) => [`m${index}`, { media: [{
    idMal: id, season: null, seasonYear: null, title: { romaji: `Anime ${id}` },
    nextAiringEpisode: { airingAt: 2000000000 + id, episode: 2 },
  }] }])) } };
}

test('una biblioteca grande se divide sin superar la complejidad y conserva todos los IDs', async () => {
  const batches = [];
  const read = personalService(async (_provider, _scope, _url, options) => {
    assert.equal(options.cache, 'no-store');
    const { ids, response } = resultFor(JSON.parse(options.body).query);
    batches.push(ids.length);
    return response;
  });
  const ids = Array.from({ length: 61 }, (_, i) => i + 1);
  const result = await read([...ids, 1, 0, NaN, -5, 2.5]);
  assert.equal(result.nextUnavailable, false);
  assert.deepEqual(batches, [25, 25, 11]);
  assert.deepEqual(Array.from(result.next, (event) => event.id), ids);
});

test('si falla una tanda se marca incompleto y no se hacen solicitudes posteriores', async () => {
  let calls = 0;
  const read = personalService(async (_provider, _scope, _url, options) => {
    if (++calls === 2) throw new Error('Provider unavailable');
    return resultFor(JSON.parse(options.body).query).response;
  });
  const result = await read(Array.from({ length: 70 }, (_, i) => i + 1));
  assert.equal(result.nextUnavailable, true);
  assert.equal(result.next.length, 25);
  assert.equal(calls, 2);
});

test('una biblioteca vacía no consulta el proveedor', async () => {
  const read = personalService(() => { throw new Error('Unexpected request'); });
  const result = await read([]);
  assert.equal(result.nextUnavailable, false);
  assert.equal(result.next.length, 0);
});
