import test from 'node:test';
import assert from 'node:assert/strict';
import { homeDisplayName, homeLocalDate } from '../src/lib/home-greeting.ts';

test('elige el primer nombre disponible y tolera datos ausentes', () => {
  assert.equal(homeDisplayName('  Rodri Pérez  ', 'rodrip'), 'Rodri');
  assert.equal(homeDisplayName(null, '  ', ' Ana María '), 'Ana');
  assert.equal(homeDisplayName(undefined, 42, null), null);
});

test('la fecha usa el día local y no la fecha UTC', () => {
  const originalTZ = process.env.TZ;
  try {
    const instant = Date.parse('2027-01-01T01:00:00Z');
    process.env.TZ = 'America/Argentina/Buenos_Aires';
    assert.equal(homeLocalDate(instant).dateTime, '2026-12-31');
    assert.match(homeLocalDate(instant).label, /31 de diciembre/);
    process.env.TZ = 'Asia/Tokyo';
    assert.equal(homeLocalDate(instant).dateTime, '2027-01-01');
    assert.match(homeLocalDate(instant).label, /1 de enero/);
  } finally {
    if (originalTZ === undefined) delete process.env.TZ;
    else process.env.TZ = originalTZ;
  }
});
