import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { gzipSync } from 'node:zlib';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync('src/services/imdb-ratings.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const header = 'tconst\taverageRating\tnumVotes\n';
const ratings = `${header}tt1355642\t9.1\t200000\ntt1000001\t10.1\t12\ntt1000002\t8.3\t0\ntt1000003\t7.4\t10`;

function fixture(responses) {
  const exports = {};
  let calls = 0;
  runInNewContext(source, {
    exports, AbortSignal, DecompressionStream, TextDecoderStream,
    fetch: async () => responses[calls++],
    require(name) {
      if (name === 'server-only') return {};
      if (name === 'next/cache') return { unstable_cache: fn => fn };
      if (name === '@/services/calendar-mappings') return {
        getCalendarMappings: async () => ({ byImdb: { tt1355642: [5114], tt1000001: [1], tt1000002: [2] } }),
      };
      throw new Error(name);
    },
  });
  return { getScore: exports.getImdbScore, calls: () => calls };
}

test('lee el gzip por ID exacto, comparte la carga concurrente y descarta filas sin nota válida o equivalencia', async () => {
  const f = fixture([new Response(gzipSync(ratings))]);
  assert.equal(await f.getScore(undefined), null);
  assert.equal(await f.getScore('5114'), null);
  assert.equal(f.calls(), 0);
  assert.deepEqual(await Promise.all(['tt1355642', 'tt1000001', 'tt1000002', 'tt1000003'].map(f.getScore)), [9.1, null, null, null]);
  assert.equal(f.calls(), 1);
});

test('un fallo del archivo se degrada a nota ausente y permite volver a consultar', async () => {
  const f = fixture([new Response(null, { status: 503 }), new Response(gzipSync('invalid\n')), new Response(gzipSync(ratings))]);
  assert.equal(await f.getScore('tt1355642'), null);
  assert.equal(await f.getScore('tt1355642'), null);
  assert.equal(await f.getScore('tt1355642'), 9.1);
});
