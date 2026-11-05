import test from 'node:test';
import assert from 'node:assert/strict';
import {
  localDay,
  monday,
  resolveCalendarIdentities,
  mergeCalendar,
  validDay,
} from '../src/lib/calendar-week.ts';
const event = {
  key: 'a',
  malId: 5,
  title: 'Serie A',
  aliases: ['Otro título'],
  cover: null,
  at: Date.parse('2026-11-03T01:00:00Z'),
  episode: 4,
  source: 'AniList',
};
test('la emisión del martes UTC cae el lunes en Argentina', () => {
  assert.equal(localDay(event.at, 'America/Argentina/Buenos_Aires'), '2026-11-02');
  assert.equal(monday('2027-01-01'), '2026-12-28');
  assert.equal(validDay('2026-02-30'), false);
});
test('une episodios por alias y conserva el ID externo sin confundir temporadas', () => {
  const maze = {
    ...event,
    key: 'b',
    malId: null,
    title: 'Otro título',
    aliases: [],
    source: 'TVmaze',
    imdbId: 'tt123456',
  };
  const other = { ...event, key: 'c', malId: 9 };
  const results = mergeCalendar([[event], [maze], [other]], '2026-11-02', 'UTC');
  assert.equal(results.length, 2);
  assert.equal(results.find((e) => e.malId === 5).imdbId, 'tt123456');
  assert.equal(mergeCalendar([[event], [{ ...maze, episode: 5 }]], '2026-11-02', 'UTC').length, 2);
});
test('el horario habitual no duplica ni reemplaza una emisión con fecha', () => {
  const mal = { ...event, key: 'm', source: 'MAL', episode: null, at: event.at + 3600000 };
  assert.equal(mergeCalendar([[event], [mal]], '2026-11-02', 'UTC')[0].at, event.at);
  assert.equal(mergeCalendar([[event], [mal]], '2026-11-02', 'UTC').length, 1);
});
test('reconoce Ranma ½ aunque otra fuente use año y temporada en el título', () => {
  const anime = { ...event, title: 'Ranma1/2 (2024) Season 3', aliases: [], episode: 6 };
  const tv = {
    ...anime,
    key: 'tv',
    source: 'TVmaze',
    malId: null,
    title: 'Ranma ½',
    at: anime.at - 60000,
    imdbId: 'tt1234567',
  };
  assert.equal(mergeCalendar([[anime], [tv]], '2026-11-02', 'UTC').length, 1);
  assert.equal(mergeCalendar([[anime], [{ ...tv, at: tv.at + 7200000 }]], '2026-11-02', 'UTC').length, 2);
});

test('cruza idiomas y numeración por identidad compartida sin elegir entre dos temporadas posibles', () => {
  const maze = {
    ...event,
    key: 'maze-4',
    malId: null,
    title: 'Different English Title',
    source: 'TVmaze',
    imdbId: 'tt123456',
    episode: 19,
  };
  const index = { tt123456: [5, 9] };
  const identified = resolveCalendarIdentities([event], [maze], index);
  assert.equal(mergeCalendar([[event], identified], '2026-11-02', 'UTC').length, 1);
  const ambiguous = resolveCalendarIdentities(
    [event, { ...event, malId: 9, key: 'another' }],
    [maze],
    index,
  );
  assert.equal(ambiguous[0].malId, null);
});
test('un alias de MAL puede vincular una emisión aunque llegue al final', () => {
  const tv = {
    ...event,
    source: 'TVmaze',
    malId: null,
    key: 'tv',
    title: 'Título en inglés',
    aliases: [],
  };
  const mal = { ...event, source: 'MAL', key: 'mal', episode: null, title: 'Título en inglés' };
  assert.equal(mergeCalendar([[event], [tv], [mal]], '2026-11-02', 'UTC').length, 1);
});
