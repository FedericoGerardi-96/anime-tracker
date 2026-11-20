import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function load(file, dependencies) {
  const exports = {};
  const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  runInNewContext(outputText, {
    exports, URL, Response, AbortSignal, process: { env: { MAL_CLIENT_ID: 'test-client' } },
    require(name) {
      if (name === 'server-only') return {};
      if (name in dependencies) return dependencies[name];
      throw Error(name);
    },
  });
  return exports;
}

test('la preferencia usa la cuenta actual y conserva la búsqueda habilitada si todavía no hay elección', async () => {
  let user = null;
  const service = load('src/services/search-preferences.ts', {
    '@/services/supabase': { getAuthenticatedUser: async () => user },
  });
  assert.equal(await service.getAdultSearchEnabled(), true);
  for (const value of [undefined, true, 'false', false]) {
    user = { user_metadata: { search_include_adult: value } };
    assert.equal(await service.getAdultSearchEnabled(), value !== false);
  }
});

for (const provider of ['anilist', 'myanimelist']) {
  for (const type of ['anime', 'manga']) {
    test(`${provider}/${type} aplica +18 en catálogo y sugerencias sin consultas adicionales al proveedor`, async () => {
      let enabled = true;
      const calls = [];
      const dependencies = {
        '@/services/search-preferences': { getAdultSearchEnabled: async () => enabled },
        '@/services/provider-request': {
          ProviderRequestError: Error,
          providerRead: async (_provider, _operation, url, init) => {
            const variables = init.body ? JSON.parse(init.body).variables : null;
            calls.push(variables ?? url);
            const includeAdult = variables ? !Object.hasOwn(variables, 'isAdult') : url.searchParams.get('nsfw') === 'true';
            const media = [
              { id: 1, idMal: 1, title: { romaji: 'General' } },
              ...(includeAdult ? [{ id: 2, idMal: 2, title: { romaji: 'Adulto' } }] : []),
            ];
            return variables
              ? { data: { Page: { media, pageInfo: { lastPage: 1, hasNextPage: false } } } }
              : { data: media.map(item => ({ node: { id: item.id, title: item.title.romaji } })), paging: {} };
          },
        },
      };
      const ani = load('src/services/anilist-catalog.ts', dependencies);
      const mal = load('src/lib/myanimelist-service.ts', dependencies);
      const route = load('src/app/api/catalog/search/route.ts', {
        '@/services/catalog-provider': { getCatalogProvider: async () => provider },
        '@/services/anilist-catalog': ani,
        '@/lib/myanimelist-service': mal,
        '@/services/anilist-characters': {},
      });
      for (const allowed of [true, false, true]) {
        enabled = allowed;
        const options = { q: 'Título', page: 2 };
        const catalog = provider === 'anilist'
          ? (await ani.getAniListCatalog(type, options)).items
          : type === 'anime' ? (await mal.getMalAnimeCatalog(options)).anime : (await mal.getMalMangaCatalog(options)).manga;
        assert.equal(catalog.length, allowed ? 2 : 1);
        const response = await route.GET(new Request(`http://localhost/api/catalog/search?type=${type}&q=Título`));
        assert.equal(response.status, 200);
        assert.equal((await response.json()).data.length, allowed ? 2 : 1);
        const request = calls.at(-1);
        if (provider === 'anilist') {
          assert.equal(request.type, type.toUpperCase());
          assert.equal(request.perPage, 5);
          assert.equal(request.isAdult, allowed ? undefined : false);
        } else {
          assert.equal(request.pathname, `/v2/${type}`);
          assert.equal(request.searchParams.get('limit'), '5');
          assert.equal(request.searchParams.get('nsfw'), String(allowed));
        }
      }
      assert.equal(calls.length, 6);
    });
  }
}

test('la navegación sin texto mantiene el filtro de AniList y no consulta la preferencia', async () => {
  let reads = 0;
  const service = load('src/services/anilist-catalog.ts', {
    '@/services/search-preferences': { getAdultSearchEnabled: async () => { reads++; return true; } },
    '@/services/provider-request': { providerRead: async (_provider, _operation, _url, init) => {
      assert.equal(JSON.parse(init.body).variables.isAdult, false);
      return { data: { Page: { media: [], pageInfo: { lastPage: 1, hasNextPage: false } } } };
    } },
  });
  await service.getAniListCatalog('anime');
  await service.getAniListCatalog('manga');
  assert.equal(reads, 0);
});

test('guardar valida sesión y entrada, confirma la escritura y conserva otros metadatos', async () => {
  let user = { user_metadata: { calendar_timezone: 'UTC', search_include_adult: true } };
  let fail = false;
  let writes = 0;
  const invalidations = [];
  const action = load('src/lib/actions/search-preferences.ts', {
    'next/cache': { revalidatePath: path => invalidations.push(path) },
    '@/lib/supabase/server': { createClient: async () => ({ auth: {
      getUser: async () => ({ data: { user }, error: null }),
      updateUser: async ({ data }) => {
        writes++;
        if (fail) return { data: { user: null }, error: Error('No disponible') };
        user = { ...user, user_metadata: { ...user.user_metadata, ...data } };
        return { data: { user }, error: null };
      },
    } }) },
  });
  assert.ok((await action.saveAdultSearchPreference('true')).error);
  assert.equal(writes, 0);
  assert.equal((await action.saveAdultSearchPreference(false)).includeAdult, false);
  assert.equal(user.user_metadata.calendar_timezone, 'UTC');
  assert.deepEqual(invalidations, ['/settings/privacy']);
  fail = true;
  assert.ok((await action.saveAdultSearchPreference(true)).error);
  assert.equal(user.user_metadata.search_include_adult, false);
  assert.equal(invalidations.length, 1);
  user = null;
  assert.ok((await action.saveAdultSearchPreference(true)).error);
  assert.equal(writes, 2);
});
