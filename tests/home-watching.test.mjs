import test from 'node:test';
import assert from 'node:assert/strict';
import { remainingWatchingEpisodes, selectRandomWatching } from '../src/lib/home-watching-selection.ts';

test('selecciona hasta tres series sin repetir ni modificar la biblioteca', () => {
  const series = ['A', 'B', 'C', 'D'];
  assert.deepEqual(selectRandomWatching(series, 3, () => 0), ['A', 'B', 'C']);
  assert.deepEqual(selectRandomWatching(series, 3, (max) => max - 1), ['D', 'A', 'B']);
  assert.deepEqual(series, ['A', 'B', 'C', 'D']);
  assert.deepEqual(selectRandomWatching(['A'], 3, () => 0), ['A']);
  assert.deepEqual(selectRandomWatching([], 3, () => 0), []);
});

test('calcula episodios pendientes solo cuando el total es conocido', () => {
  assert.equal(remainingWatchingEpisodes(12, 8), 4);
  assert.equal(remainingWatchingEpisodes(12, 12), 0);
  assert.equal(remainingWatchingEpisodes(12, 15), 0);
  assert.equal(remainingWatchingEpisodes(null, 8), null);
  assert.equal(remainingWatchingEpisodes(0, 8), null);
  assert.equal(remainingWatchingEpisodes(12, -1), null);
});
