import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function load(file, dependencies) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(source, {
    exports, URL, Response, AbortSignal, process: { env: { MAL_CLIENT_ID: 'test-client' } },
    require(name) {
      if (name === 'server-only') return {};
      if (name in dependencies) return dependencies[name];
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return exports;
}

function fixture(includeAdult = true) {
  const calls = [];
  const service = load('src/lib/myanimelist-service.ts', {
    '@/services/search-preferences': { getAdultSearchEnabled: async () => includeAdult },
    '@/services/provider-request': {
      providerRead: async (provider, operation, url) => {
        calls.push(url);
        const data = url.searchParams.get('nsfw') === 'true'
          ? [{ node: { id: 131446, title: 'Kouiu no ga Ii', media_type: 'manga' } }]
          : [];
        return { data, paging: {} };
      },
    },
  });
  return { service, calls };
}

test('la búsqueda de manga recupera títulos excluidos por el filtro de MAL y conserva la paginación', async () => {
  const { service, calls } = fixture();
  const result = await service.getMalMangaCatalog({ q: ' Kouiu no ga Ii ', page: 2, limit: 24 });
  assert.equal(result.manga[0]?.id, 131446);
  assert.equal(result.hasNextPage, false);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].pathname, '/v2/manga');
  assert.equal(calls[0].searchParams.get('q'), 'Kouiu no ga Ii');
  assert.equal(calls[0].searchParams.get('offset'), '24');
});

test('las sugerencias de manga usan el mismo servicio y devuelven la ficha con su ID MAL', async () => {
  const { service, calls } = fixture();
  const route = load('src/app/api/catalog/search/route.ts', {
    '@/services/catalog-provider': { getCatalogProvider: async () => 'myanimelist' },
    '@/services/anilist-catalog': {},
    '@/services/anilist-characters': {},
    '@/lib/myanimelist-service': service,
  });
  const response = await route.GET(new Request('http://localhost/api/catalog/search?type=manga&q=Kouiu%20no%20ga%20Ii'));
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.data[0]?.mal_id, 131446);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].searchParams.get('limit'), '5');
});

test('el catálogo sin búsqueda conserva el filtro predeterminado de MAL', async () => {
  const { service, calls } = fixture();
  await service.getMalMangaCatalog({ q: ' ', sort: 'score' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].pathname, '/v2/manga/ranking');
  assert.equal(calls[0].searchParams.get('ranking_type'), 'all');
  assert.equal(calls[0].searchParams.has('nsfw'), false);
});

test('la preferencia desactivada excluye +18 en las búsquedas de anime y manga de MAL', async () => {
  const { service, calls } = fixture(false);
  assert.equal((await service.getMalAnimeCatalog({ q: 'Título' })).anime.length, 0);
  assert.equal((await service.getMalMangaCatalog({ q: 'Título' })).manga.length, 0);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].pathname, '/v2/anime');
  assert.equal(calls[1].pathname, '/v2/manga');
  assert.ok(calls.every(url => url.searchParams.get('nsfw') === 'false'));
});
