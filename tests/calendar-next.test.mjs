import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { selectNextCalendarEvent } from '../src/lib/calendar-week.ts';
import { parsePublicHomeAirings } from '../src/lib/home-airing.ts';

function service(providerRead, getPersonalNextAirings) {
  const source = ts.transpileModule(fs.readFileSync('src/services/calendar-next.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    require(name) {
      if (name === 'server-only') return {};
      if (name === '@/lib/home-airing') return { parsePublicHomeAirings };
      if (name === '@/services/provider-request') return { providerRead };
      if (name === '@/services/home-personal-schedule') return { getPersonalNextAirings };
      throw new Error(`Unexpected import ${name}`);
    },
  });
  return exports.getCalendarNext;
}

const now = Date.parse('2026-11-04T22:00:00Z');
const event = (key, at, source = 'AniList') => ({ key, at, source, episode: 2, malId: 1, title: key, cover: null });

test('elige la próxima desde ahora, omite pasado/estimaciones y avanza al vencer sin mutar datos', () => {
  const events = [event('next-year', Date.parse('2027-01-01')), event('tomorrow', now + 86400000), event('past', now - 1), event('estimated', now + 1, 'MAL'), event('now', now)];
  assert.equal(selectNextCalendarEvent(events, now)?.key, 'tomorrow');
  assert.equal(selectNextCalendarEvent(events, now + 86400000)?.key, 'next-year');
  assert.equal(events[0].key, 'next-year');
  assert.equal(selectNextCalendarEvent(events, Date.parse('2028-01-01')), null);
  assert.equal(selectNextCalendarEvent([], now), null);
});

test('el modo público consulta el futuro sin restringir temporada ni biblioteca', async () => {
  const getNext = service(async (_provider, _scope, _url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.variables.start, Math.floor(now / 60000) * 60);
    assert.doesNotMatch(body.query, /season|idMal:|airingAt_lesser/);
    assert.equal(options.next.revalidate, 60);
    return { data: Object.fromEntries([1, 2, 3, 4].map((i) => [`p${i}`, {
      pageInfo: { hasNextPage: true },
      airingSchedules: i === 1 ? [{ id: 1, airingAt: now / 1000 + 3600, episode: 3, media: { idMal: null, isAdult: false, title: { romaji: 'Public release' } } }] : [],
    }])) };
  }, () => { throw new Error('Public mode must not query the library'); });
  const result = await getNext(now, null);
  assert.equal(result.unavailable, false);
  assert.equal(selectNextCalendarEvent(result.events, now)?.title, 'Public release');
});

test('biblioteca vacía no cae en emisiones generales; conserva fechas de futuras temporadas', async () => {
  const getNext = service(() => { throw new Error('Personal mode must not query all anime'); }, async (ids) => ({
    next: ids.map((id) => ({ id, title: 'Personal', episode: 1, airingAt: Date.parse('2027-02-01') / 1000, coverImage: null })),
    nextUnavailable: false,
  }));
  assert.equal((await getNext(now, [])).events.length, 0);
  const personal = await getNext(now, [42]);
  assert.equal(personal.events[0].malId, 42);
  assert.equal(selectNextCalendarEvent(personal.events, now)?.at, Date.parse('2027-02-01'));
});

test('un fallo parcial personal se conserva y un error de proveedor no se convierte en un vacío exitoso', async () => {
  const getNext = service(async () => { throw new Error('Unavailable'); }, async () => ({ next: [], nextUnavailable: true }));
  assert.equal((await getNext(now, [42])).unavailable, true);
  await assert.rejects(getNext(now, null), /Unavailable/);
});
