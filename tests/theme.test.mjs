import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTheme, resolveTheme } from '../src/lib/theme.ts';

test('conserva las preferencias anteriores y rechaza valores externos inválidos', () => {
  assert.equal(parseTheme('dark'), 'aurora-nocturna');
  assert.equal(parseTheme('light'), 'aurora-clara');
  for (const value of ['aurora-nocturna', 'aurora-clara', 'estreno', 'auto']) {
    assert.equal(parseTheme(value), value);
  }
  for (const value of [undefined, null, '', 'system', '<script>']) {
    assert.equal(parseTheme(value), null);
  }
});

test('automático sigue el sistema sin modificar elecciones explícitas', () => {
  assert.equal(resolveTheme('auto', true), 'aurora-nocturna');
  assert.equal(resolveTheme('auto', false), 'aurora-clara');
  assert.equal(resolveTheme('estreno', false), 'estreno');
  assert.equal(resolveTheme('aurora-clara', true), 'aurora-clara');
  assert.equal(resolveTheme('aurora-nocturna', false), 'aurora-nocturna');
});
