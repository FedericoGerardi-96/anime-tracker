import test from 'node:test';
import assert from 'node:assert/strict';
import { updateCatalogFilterParams } from '../src/lib/catalog-filter-values.ts';

test('actualizar filtros conserva parámetros ajenos y excluidos antiguos, y reinicia paginación', () => {
  const original = new URLSearchParams('q=one&genre=Action&excludeGenre=Drama&page=8&other=1');
  const next = updateCatalogFilterParams(original, { genre: 'Action,Fantasy', q: 'two' });
  assert.equal(next.get('genre'), 'Action,Fantasy');
  assert.equal(next.get('excludeGenre'), 'Drama');
  assert.equal(next.get('other'), '1');
  assert.equal(next.has('page'), false);
  assert.equal(original.get('page'), '8');
});

test('limpiar excluidos elimina el parámetro y conserva los demás filtros', () => {
  const next = updateCatalogFilterParams(new URLSearchParams('genre=Action&excludeGenre=Drama&page=4'), { excludeGenre: null });
  assert.equal(next.toString(), 'genre=Action');
});
