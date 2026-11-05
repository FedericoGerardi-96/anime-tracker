import test from 'node:test';
import assert from 'node:assert/strict';
import { formatHomeAiringTime, parseHomeAiringResponse, parsePublicHomeAirings, selectTodayHomeAirings, upcomingHomeAirings } from '../src/lib/home-airing.ts';

const items = [
  { id: 21, title: 'Serie A', href: '/anime/21-serie-a' },
  { id: 22, title: 'Serie B', href: '/anime/22-serie-b' },
  { id: 23, title: 'Serie C', href: '/anime/23-serie-c' },
];

test('asocia los horarios por resultado y omite títulos sin emisión o sin coincidencia', () => {
  const result = { data: {
    m0: { media: [{ nextAiringEpisode: { airingAt: 2000, episode: 7 } }] },
    m1: { media: [{ nextAiringEpisode: null }] },
    m2: { media: [] },
  } };
  assert.deepEqual(parseHomeAiringResponse(result, items), [{ ...items[0], airingAt: 2000, episode: 7 }]);
});

test('rechaza fechas o episodios inválidos en vez de mostrar horarios inventados', () => {
  for (const airing of [{ airingAt: 0, episode: 1 }, { airingAt: 100, episode: 0 }, { airingAt: '100', episode: 1 }, { airingAt: 8_640_000_000_001, episode: 1 }]) {
    assert.throws(() => parseHomeAiringResponse({ data: { m0: { media: [{ nextAiringEpisode: airing }] } } }, items.slice(0, 1)));
  }
  assert.throws(() => parseHomeAiringResponse({ data: {} }, items.slice(0, 1)));
});

test('ordena emisiones futuras y excluye las ya transcurridas, sin mutar la entrada', () => {
  const events = [
    { ...items[0], airingAt: 300, episode: 1 },
    { ...items[1], airingAt: 100, episode: 1 },
    { ...items[2], airingAt: 200, episode: 1 },
  ];
  assert.deepEqual(upcomingHomeAirings(events, 100_000).map((event) => event.id), [23, 21]);
  assert.deepEqual(events.map((event) => event.id), [21, 22, 23]);
});

test('convierte el instante de emisión a la zona local, incluso al cambiar de día', () => {
  const instant = Date.parse('2027-01-01T01:00:00Z') / 1000;
  const buenosAires = formatHomeAiringTime(instant, 'America/Argentina/Buenos_Aires');
  const tokyo = formatHomeAiringTime(instant, 'Asia/Tokyo');
  assert.match(buenosAires, /31 dic.*22:00/);
  assert.match(tokyo, /1 ene.*10:00/);
});

test('valida el calendario público, excluye contenido adulto y admite series sin ID MAL', () => {
  const data = { p1: { pageInfo: { hasNextPage: true }, airingSchedules: [
    { id: 1, airingAt: 100, episode: 2, media: { idMal: null, isAdult: false, title: { english: null, romaji: 'Serie' } } },
    { id: 2, airingAt: 200, episode: 1, media: { idMal: 2, isAdult: true, title: { romaji: 'Adulto' } } },
  ] }, p2: { pageInfo: { hasNextPage: true }, airingSchedules: [] } };
  assert.deepEqual(parsePublicHomeAirings({ data }, 2), { events: [{ id: 1, airingAt: 100, episode: 2, malId: null, title: 'Serie', coverImage: null }], incomplete: true });
  assert.throws(() => parsePublicHomeAirings({ data: { p1: data.p1 } }, 2));
  assert.throws(() => parsePublicHomeAirings({ data: { p1: { pageInfo: { hasNextPage: false }, airingSchedules: [{ id: 1 }] } } }, 1));
});

test('acepta portadas de AniList y conserva el horario si falta o es inválida', () => {
  const entry = (id, medium) => ({ id, airingAt: 100, episode: 1, media: { isAdult: false, title: { romaji: 'Serie' }, coverImage: { medium } } });
  const result = parsePublicHomeAirings({ data: { p1: { pageInfo: { hasNextPage: false }, airingSchedules: [
    entry(1, 'https://s4.anilist.co/file/anilistcdn/test.jpg'), entry(2, null), entry(3, 'https://example.org/cover.jpg'), entry(4, 'not-a-url'),
  ] } } }, 1);
  assert.deepEqual(result.events.map((event) => event.coverImage), ['https://s4.anilist.co/file/anilistcdn/test.jpg', null, null, null]);
});

test('selecciona dos emisiones por lado de ahora solo del día local', () => {
  const originalTZ = process.env.TZ;
  try {
    process.env.TZ = 'America/Argentina/Buenos_Aires';
    const now = Date.parse('2027-01-01T15:00:00Z');
    const event = (id, date) => ({ id, malId: id, title: String(id), episode: 1, airingAt: Date.parse(date) / 1000 });
    const events = [
      event(1, '2027-01-01T02:59:00Z'), event(2, '2027-01-01T04:00:00Z'),
      event(3, '2027-01-01T12:00:00Z'), event(4, '2027-01-01T15:00:00Z'),
      event(5, '2027-01-01T16:00:00Z'), event(6, '2027-01-02T02:59:00Z'),
      event(7, '2027-01-02T03:00:00Z'),
    ];
    const selected = selectTodayHomeAirings(events, now);
    assert.deepEqual(selected.before.map((item) => item.id), [3, 4]);
    assert.deepEqual(selected.after.map((item) => item.id), [5, 6]);
  } finally {
    if (originalTZ === undefined) delete process.env.TZ;
    else process.env.TZ = originalTZ;
  }
});

test('respeta el día local durante el cambio de horario de verano', () => {
  const originalTZ = process.env.TZ;
  try {
    process.env.TZ = 'America/New_York';
    const now = Date.parse('2027-03-14T16:00:00Z');
    const event = (id, date) => ({ id, malId: id, title: String(id), episode: 1, airingAt: Date.parse(date) / 1000 });
    const selected = selectTodayHomeAirings([
      event(1, '2027-03-14T04:59:00Z'), event(2, '2027-03-14T05:00:00Z'),
      event(3, '2027-03-15T03:59:00Z'), event(4, '2027-03-15T04:00:00Z'),
    ], now);
    assert.deepEqual(selected.before.map((item) => item.id), [2]);
    assert.deepEqual(selected.after.map((item) => item.id), [3]);
  } finally {
    if (originalTZ === undefined) delete process.env.TZ;
    else process.env.TZ = originalTZ;
  }
});

test('el panel personal muestra todas las series de hoy y elige la próxima de la temporada local', async () => {
  const { selectPersonalHomeSchedule } = await import('../src/lib/home-airing.ts');
  const originalTZ = process.env.TZ;
  try {
    process.env.TZ = 'America/Argentina/Buenos_Aires';
    const now = Date.parse('2027-01-01T15:00:00Z');
    const event = (id, date) => ({ id, malId: id, title: String(id), episode: 1, airingAt: Date.parse(date) / 1000 });
    const future = (id, date, season, seasonYear) => ({ ...event(id, date), href: '/anime/' + id, season, seasonYear });
    const selected = selectPersonalHomeSchedule([
      event(1, '2027-01-01T02:59:00Z'), event(2, '2027-01-01T04:00:00Z'),
      event(3, '2027-01-01T16:00:00Z'), event(4, '2027-01-02T02:59:00Z'),
      event(5, '2027-01-02T03:00:00Z'),
    ], [future(6, '2027-01-02T04:00:00Z', 'FALL', 2026), future(7, '2027-01-03T04:00:00Z', 'WINTER', 2027), future(8, '2027-01-02T05:00:00Z', 'WINTER', 2027)], now);
    assert.deepEqual(selected.today.map((item) => item.id), [2, 3, 4]);
    assert.equal(selected.next.id, 8);
  } finally {
    if (originalTZ === undefined) delete process.env.TZ;
    else process.env.TZ = originalTZ;
  }
});

test('valida las emisiones personales y conserva temporada y año del proveedor', async () => {
  const { parsePersonalNextAirings } = await import('../src/lib/home-airing.ts');
  const media = { season: 'WINTER', seasonYear: 2027, title: { english: null, romaji: 'Una serie' }, coverImage: { medium: 'https://s4.anilist.co/cover.jpg' }, nextAiringEpisode: { airingAt: 2000, episode: 2 } };
  const result = parsePersonalNextAirings({ data: { m0: { media: [media] }, m1: { media: [] } } }, [42, 43]);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 42);
  assert.equal(result[0].season, 'WINTER');
  assert.equal(result[0].coverImage, 'https://s4.anilist.co/cover.jpg');
  assert.throws(() => parsePersonalNextAirings({ data: { m0: { media: [{ ...media, nextAiringEpisode: { airingAt: 0, episode: 1 } }] } } }, [42]));
});
