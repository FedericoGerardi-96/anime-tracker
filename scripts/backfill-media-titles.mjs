import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { createRequire } from 'node:module';

const endpoint = 'https://graphql.anilist.co';
const query = `query LibraryTitles($ids: [Int], $type: MediaType) {
  Page(page: 1, perPage: 50) {
    media(idMal_in: $ids, type: $type) { idMal type title { english romaji } }
  }
}`;
const fields = ['title_english', 'title_romaji'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseOptions(args) {
  const options = { apply: false, limit: Infinity, after: null, help: false };
  for (const arg of args) {
    if (arg === '--apply') options.apply = true;
    else if (arg === '--help') options.help = true;
    else if (/^--limit=\d+$/.test(arg) && Number(arg.slice(8)) > 0 && Number.isSafeInteger(Number(arg.slice(8)))) options.limit = Number(arg.slice(8));
    else if (arg.startsWith('--after=') && uuid.test(arg.slice(8))) options.after = arg.slice(8);
    else throw new Error(`Opción inválida: ${arg.split('=')[0]}. Usá --help.`);
  }
  return options;
}

function title(value) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || value.trim().length > 500) throw new Error('AniList devolvió un título inválido.');
  return value.trim() || null;
}

export function parseTitleResponse(payload, type, ids) {
  if (payload?.errors?.length || !Array.isArray(payload?.data?.Page?.media)) throw new Error('AniList devolvió una respuesta incompleta.');
  const wanted = new Set(ids);
  const result = new Map();
  for (const item of payload.data.Page.media) {
    if (!Number.isSafeInteger(item?.idMal) || !wanted.has(item.idMal) || item.type !== type.toUpperCase() || !item.title || typeof item.title !== 'object') {
      throw new Error('La identidad de una obra no coincide con el pedido; no se aplicó esta tanda.');
    }
    if (result.has(item.idMal)) throw new Error('AniList devolvió una equivalencia MAL ambigua; no se aplicó esta tanda.');
    result.set(item.idMal, { title_english: title(item.title.english), title_romaji: title(item.title.romaji) });
  }
  return result;
}

export function createTitleReader({ fetcher = fetch, pause = sleep, now = Date.now, onWait = () => {} } = {}) {
  let notBefore = 0;
  return async (type, ids) => {
    if (!['anime', 'manga'].includes(type) || !ids.length || ids.length > 25 || ids.some(id => !Number.isSafeInteger(id) || id <= 0)) throw new Error('Tanda inválida.');
    for (let attempt = 0; attempt < 4; attempt++) {
      const wait = Math.max(0, notBefore - now());
      if (wait > 0) { onWait(wait); await pause(wait); }
      notBefore = now() + 5000; // At most twelve requests/minute, including retries.
      let response;
      try {
        response = await fetcher(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, variables: { type: type.toUpperCase(), ids } }), signal: AbortSignal.timeout(20000) });
      } catch {
        if (attempt === 3) throw new Error('No se pudo consultar AniList después de cuatro intentos.');
        notBefore = Math.max(notBefore, now() + 5000 * (2 ** attempt));
        continue;
      }
      const retry = response.headers.get('Retry-After');
      const retryMs = retry ? (/^\d+$/.test(retry) ? Number(retry) * 1000 : Date.parse(retry) - now()) : 0;
      const reset = Number(response.headers.get('X-RateLimit-Reset')) * 1000;
      if (response.status === 429 || response.headers.get('X-RateLimit-Remaining') === '0') {
        notBefore = Math.max(notBefore, now() + 60000, now() + (retryMs || 0), reset ? reset + 1000 : 0);
      }
      if (response.status === 429 || response.status >= 500) {
        if (attempt === 3) throw new Error(`AniList sigue respondiendo ${response.status}. Reanudá más tarde.`);
        notBefore = Math.max(notBefore, now() + 5000 * (2 ** attempt));
        continue;
      }
      if (!response.ok) throw new Error(`AniList respondió ${response.status}; no se aplicó esta tanda.`);
      return parseTitleResponse(await response.json(), type, ids);
    }
  };
}

export function missingTitlePatch(row, variants) {
  const patch = {};
  for (const field of fields) {
    // Never replace a title already stored, even if the provider now uses another spelling.
    if (row[field] == null && variants[field]) patch[field] = variants[field];
  }
  return patch;
}

export async function applyMissingTitles(db, row, patch) {
  let updated = false;
  for (const field of fields) {
    if (!patch[field]) continue;
    const result = await db.from('media').update({ [field]: patch[field] })
      .eq('id', row.id).eq('mal_id', row.mal_id).eq('type', row.type).is(field, null).select('id');
    if (result.error) throw new Error(`No se pudo completar ${field} (${result.error.code ?? 'error de Supabase'}).`);
    updated ||= Boolean(result.data?.length);
  }
  return updated;
}

export async function backfillMediaTitles(db, options, { readTitles = createTitleReader(), log = console.log } = {}) {
  const preflight = await db.from('media').select('id,title_english,title_romaji').limit(0);
  if (preflight.error) throw new Error(`No se pueden leer los campos de títulos (${preflight.error.code ?? 'error de Supabase'}). Aplicá primero 202611110001_media_title_variants.sql y verificá las credenciales.`);
  const summary = { scanned: 0, candidates: 0, updated: 0, unmatched: 0, invalid: 0, lastId: options.after };
  let cursor = options.after;
  log(options.apply ? 'Modo escritura: se completan únicamente títulos alternativos vacíos.' : 'Vista previa: no se modifica Supabase.');
  while (summary.scanned < options.limit) {
    let request = db.from('media').select('id,mal_id,type,title_english,title_romaji')
      .in('type', ['anime', 'manga']).or('title_english.is.null,title_romaji.is.null')
      .order('id').limit(Math.min(25, options.limit - summary.scanned));
    if (cursor) request = request.gt('id', cursor);
    const { data, error } = await request;
    if (error || !Array.isArray(data)) throw new Error(`No se pudo leer la tanda. Último cursor completo: ${cursor ?? '(inicio)'}`);
    if (!data.length) break;
    try {
      for (const type of ['anime', 'manga']) {
        const rows = data.filter(row => row.type === type && Number.isSafeInteger(row.mal_id) && row.mal_id > 0);
        if (!rows.length) continue;
        const variants = await readTitles(type, [...new Set(rows.map(row => row.mal_id))]);
        for (const row of rows) {
          const titles = variants.get(row.mal_id);
          if (!titles) { summary.unmatched++; continue; }
          const patch = missingTitlePatch(row, titles);
          if (!Object.keys(patch).length) continue;
          summary.candidates++;
          if (options.apply && await applyMissingTitles(db, row, patch)) summary.updated++;
        }
      }
    } catch (error) {
      log(`Última tanda completa: ${cursor ? `--after=${cursor}` : '(inicio)'}. Es seguro repetir una tanda parcial.`);
      throw error;
    }
    summary.invalid += data.filter(row => !Number.isSafeInteger(row.mal_id) || row.mal_id <= 0).length;
    summary.scanned += data.length;
    cursor = data.at(-1).id;
    summary.lastId = cursor;
    log(`Revisadas: ${summary.scanned}; con datos nuevos: ${summary.candidates}; actualizadas: ${summary.updated}. Cursor: ${cursor}`);
  }
  return summary;
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  if (options.help) {
    console.log('Uso: node scripts/backfill-media-titles.mjs [--apply] [--limit=25] [--after=UUID]\nPor defecto es vista previa. Carga .env.local/.env con las reglas de Next.js.\nRequiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY, solo en este proceso local.');
    return;
  }
  const nextRequire = createRequire(import.meta.resolve('next/package.json'));
  const { loadEnvConfig } = nextRequire('@next/env');
  loadEnvConfig(process.cwd());
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.');
  const { createClient } = await import('@supabase/supabase-js');
  // Administrative access is restricted to this explicitly invoked local maintenance command.
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  console.log(JSON.stringify(await backfillMediaTitles(db, options), null, 2));
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => { console.error(error instanceof Error ? error.message : 'No se pudo completar el proceso.'); process.exitCode = 1; });
}
