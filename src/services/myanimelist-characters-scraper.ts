import 'server-only';

import * as cheerio from 'cheerio';
import type { AnimeCharacter, CharacterAppearance, CharacterDetail, CharacterSearchResult, CharacterVoiceActor } from '@/interfaces/character';

const MAL_ORIGIN = 'https://myanimelist.net';
const HEADERS = { Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9', 'User-Agent': 'Mozilla/5.0 (compatible; AniTrack/1.0)' };

export class MalScrapingUnavailableError extends Error {
  constructor() { super('MyAnimeList no está disponible para consultar personajes.'); this.name = 'MalScrapingUnavailableError'; }
}

async function html(path: string) {
  const response = await fetch(`${MAL_ORIGIN}${path}`, { headers: HEADERS, cache: 'no-store', signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new MalScrapingUnavailableError();
  return response.text();
}

function idFromUrl(url: string | undefined, kind: 'character' | 'people' | 'anime' | 'manga') {
  const value = url?.match(new RegExp(`/${kind}/(\\d+)`))?.[1];
  return value ? Number(value) : null;
}

function originalImage(url?: string) { return url ? url.replace(/\/r\/\d+x\d+\//, '/').split('?')[0] : ''; }
function clean(value: string) { return value.replaceAll('\u00a0', ' ').replace(/\s+/g, ' ').trim(); }

function japaneseVoiceActor($: cheerio.CheerioAPI, table: ReturnType<cheerio.CheerioAPI>): CharacterVoiceActor[] {
  const row = table.find('.js-anime-character-va-lang').filter((_, element) => clean($(element).find('.js-anime-character-language').text()).toLowerCase() === 'japanese').first();
  const link = row.find('a[href*="/people/"]').first();
  const id = idFromUrl(link.attr('href'), 'people');
  if (!row.length || !id) return [];
  return [{ id, name: clean(link.text()), image: originalImage(row.find('img').attr('data-src') || row.find('img').attr('src')), language: 'Japonés', url: link.attr('href') || `${MAL_ORIGIN}/people/${id}` }];
}

export async function scrapeMalAnimeCharacters(animeMalId: number): Promise<AnimeCharacter[]> {
  const $ = cheerio.load(await html(`/anime/${animeMalId}/_/characters`));
  const characters: AnimeCharacter[] = [];
  $('.js-anime-character-table').each((_, element) => {
    const table = $(element);
    const link = table.find('a[href*="/character/"]').first();
    const malId = idFromUrl(link.attr('href'), 'character');
    if (!malId) return;
    const roleText = table.find('.spaceit_pad').map((__, node) => clean($(node).text())).get().find((text) => /^(Main|Supporting)$/i.test(text));
    characters.push({
      id: malId, malId, provider: 'myanimelist',
      name: clean(table.find('.h3_character_name').first().text()) || clean(table.find('img').first().attr('alt') || ''),
      alternativeNames: [], image: originalImage(table.find('img').first().attr('data-src') || table.find('img').first().attr('src')),
      description: null, favorites: Number(table.find('.js-anime-character-favorites').text().replace(/[^\d]/g, '')) || 0,
      url: link.attr('href') || `${MAL_ORIGIN}/character/${malId}`,
      role: /^main$/i.test(roleText || '') ? 'MAIN' : 'SUPPORTING', voiceActors: japaneseVoiceActor($, table),
    });
  });
  if (!characters.length) throw new MalScrapingUnavailableError();
  return characters;
}

export async function scrapeMalCharacterSearch(query: string): Promise<CharacterSearchResult> {
  const $ = cheerio.load(await html(`/character.php?q=${encodeURIComponent(query)}&cat=character`));
  const characters: AnimeCharacter[] = [];
  const seen = new Set<number>();
  $('a[href*="/character/"]').each((_, element) => {
    const link = $(element);
    const malId = idFromUrl(link.attr('href'), 'character');
    if (!malId || seen.has(malId)) return;
    const row = link.closest('tr');
    const nameLink = row.find(`a[href*="/character/${malId}/"]`).filter((__, anchor) => clean($(anchor).text()).length > 0).first();
    const name = clean(nameLink.text());
    if (!name) return;
    seen.add(malId);
    characters.push({
      id: malId,
      malId,
      provider: 'myanimelist',
      name,
      alternativeNames: [],
      image: originalImage(row.find('img').first().attr('data-src') || row.find('img').first().attr('src')),
      description: null,
      favorites: 0,
      url: nameLink.attr('href') || `${MAL_ORIGIN}/character/${malId}`,
      role: 'BACKGROUND',
      voiceActors: [],
    });
  });
  return { characters, hasNextPage: false };
}

function comparableName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).sort().join(' ');
}

export async function scrapeMalCharacterByName(name: string): Promise<CharacterDetail> {
  const result = await scrapeMalCharacterSearch(name);
  const expected = comparableName(name);
  const match = result.characters.find((character) => comparableName(character.name) === expected) ?? result.characters[0];
  if (!match?.malId) throw new MalScrapingUnavailableError();
  return scrapeMalCharacterDetail(match.malId);
}

function biography($: cheerio.CheerioAPI) {
  const container = $('td[style*="padding-left"]').first();
  const contents = container.contents().toArray();
  const headerIndex = contents.findIndex((node) => $(node).is('h2.normal_header'));
  const parts: string[] = [];
  for (const node of contents.slice(headerIndex + 1)) {
    const item = $(node);
    if (item.is('h2.normal_header')) break;
    if (item.is('br')) parts.push('\n');
    else if (node.type === 'text') {
      const value = clean(item.text());
      if (value) parts.push(value);
    }
  }
  const lines = parts.join(' ').replace(/\s*\n\s*/g, '\n').replace(/\n{3,}/g, '\n\n').trim().split('\n');
  while (lines.length && /^[^:\n]{1,35}:\s*.+/.test(lines[0])) lines.shift();
  return lines.join('\n').trim() || null;
}

function characterDetails($: cheerio.CheerioAPI) {
  const container = $('td[style*="padding-left"]').first();
  const contents = container.contents().toArray();
  const headerIndex = contents.findIndex((node) => $(node).is('h2.normal_header'));
  const details: Array<{ label: string; value: string }> = [];
  for (const node of contents.slice(headerIndex + 1)) {
    if (node.type !== 'text') continue;
    const value = clean($(node).text());
    if (!value) continue;
    const match = value.match(/^([^:]{1,35}):\s*(.+)$/);
    if (!match) break;
    details.push({ label: match[1], value: match[2] });
  }
  return details;
}

function appearances($: cheerio.CheerioAPI): CharacterAppearance[] {
  const result = new Map<string, CharacterAppearance>();
  $('td[width="225"] a[href*="myanimelist.net/anime/"], td[width="225"] a[href*="myanimelist.net/manga/"]').each((_, element) => {
    const link = $(element); const href = link.attr('href') || ''; const type = href.includes('/manga/') ? 'MANGA' : 'ANIME';
    const malId = idFromUrl(href, type === 'MANGA' ? 'manga' : 'anime');
    if (!malId) return;
    const container = link.closest('tr');
    const textLink = container.find('a[href*="myanimelist.net/anime/"], a[href*="myanimelist.net/manga/"]').filter((__, anchor) => clean($(anchor).text()).length > 0).first();
    const title = clean(textLink.text()) || decodeURIComponent(href.split('/').pop()?.replaceAll('_', ' ') || 'Sin título');
    result.set(`${type}-${malId}`, { malId, title, type, image: originalImage(container.find('img').first().attr('data-src') || container.find('img').first().attr('src')) });
  });
  return [...result.values()].slice(0, 25);
}

async function pictures(malId: number, mainImage: string) {
  try {
    const $ = cheerio.load(await html(`/character/${malId}/_/pictures`));
    return [...new Set($('img').map((_, element) => originalImage($(element).attr('data-src') || $(element).attr('src'))).get()
      .filter((url) => url.includes('/images/characters/') && url !== mainImage))].slice(0, 12);
  } catch {
    return [];
  }
}

export async function scrapeMalCharacterDetail(malId: number): Promise<CharacterDetail> {
  const $ = cheerio.load(await html(`/character/${malId}`));
  const name = clean($('h1.title-name strong').first().text());
  if (!name) throw new MalScrapingUnavailableError();
  const description = biography($);
  const header = $('td[style*="padding-left"] > h2.normal_header').first().text();
  const voiceActors: CharacterVoiceActor[] = [];
  $('a[href*="/people/"]').each((_, element) => {
    const link = $(element); const actorId = idFromUrl(link.attr('href'), 'people'); const row = link.closest('tr');
    const language = clean(row.text()).match(/Japanese|English|Spanish|Korean|French|German|Italian|Portuguese|Mandarin|Hebrew|Hungarian/i)?.[0];
    if (!actorId || !language || voiceActors.some((actor) => actor.id === actorId)) return;
    const nameLink = row.find(`a[href*="/people/${actorId}/"]`).filter((__, anchor) => clean($(anchor).text()).length > 0).first();
    voiceActors.push({ id: actorId, name: clean(nameLink.text()) || clean(row.find('img').attr('alt') || '') || 'Nombre no disponible', image: originalImage(row.find('img').attr('data-src') || row.find('img').attr('src')), language, url: nameLink.attr('href') || link.attr('href') || `${MAL_ORIGIN}/people/${actorId}` });
  });
  const image = originalImage($('img.portrait-225x350').attr('data-src') || $('meta[property="og:image"]').attr('content'));
  const details = characterDetails($);
  const birthday = details.find((item) => /^(birthday|birthdate)$/i.test(item.label))?.value ?? null;
  return {
    id: malId, malId, provider: 'myanimelist', name, nativeName: header.match(/\(([^)]+)\)/)?.[1] ?? null,
    alternativeNames: [], image,
    description, age: description?.match(/(?:^|\n)Age:\s*([^\n]+)/i)?.[1]?.trim() ?? null,
    favorites: Number($('body').text().match(/Member Favorites:\s*([\d,]+)/i)?.[1]?.replaceAll(',', '')) || 0,
    url: `${MAL_ORIGIN}/character/${malId}`, voiceActors, appearances: appearances($), pictures: await pictures(malId, image), details, birthday,
  };
}
