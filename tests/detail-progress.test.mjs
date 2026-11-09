import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function fixture(total = 12) {
  let cursor = 0, timer = 0, value;
  const slots = [], effects = [], timers = new Map(), requests = [];
  const hooks = {
    useState(initial) { const i = cursor++; slots[i] ??= { value: initial }; return [slots[i].value, next => { slots[i].value = typeof next === 'function' ? next(slots[i].value) : next; }]; },
    useTransition() { const [pending, setPending] = hooks.useState(false); return [pending, action => { setPending(true); action().finally(() => setPending(false)); }]; },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((d, j) => d !== slots[i].deps[j])) { slots[i]?.cleanup?.(); slots[i] = { deps }; effects.push(() => { slots[i].cleanup = fn(); }); } },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/hooks/useDetailProgress.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, window: { addEventListener() {}, removeEventListener() {} },
    setTimeout(fn) { timers.set(++timer, fn); return timer; }, clearTimeout(id) { timers.delete(id); },
    require(name) { if (name === 'react') return hooks; return { saveLibraryEditor: (id, expected, edit) => new Promise(resolve => requests.push({ id, expected, edit, resolve })) }; },
  });
  const render = () => { cursor = 0; value = exports.useDetailProgress({ mediaId: 'local-uuid', revision: 'v1', status: 'watching', current_episode: 3 }, total); effects.splice(0).forEach(fn => fn()); };
  render();
  return { requests, get value() { return value; },
    change(n) { value.change(n); render(); },
    retry() { value.retry(); render(); },
    tick() { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(fn => fn()); render(); },
    async reply(i, error) { const req = requests[i]; req.resolve(error ? { error } : { data: { revision: 'v' + (i + 2), episode: req.edit.episode, status: req.edit.episode === total ? 'completed' : req.edit.status } }); await new Promise(resolve => setImmediate(resolve)); render(); },
  };
}
test('agrupa clics y serializa ediciones durante una solicitud usando la revisión devuelta', async () => {
  const f = fixture();
  for (let n = 4; n <= 8; n++) f.change(String(n));
  assert.equal(f.requests.length, 0); f.tick();
  assert.equal(f.requests[0].edit.episode, 8);
  f.change('9'); f.change('10'); f.tick(); assert.equal(f.requests.length, 1);
  await f.reply(0); assert.equal(f.value.episode, '10'); assert.equal(f.value.saved, false);
  f.tick(); assert.equal(f.requests[1].expected.revision, 'v2');
  await f.reply(1); assert.equal(f.value.saved, true); assert.equal(f.value.episode, '10');
});
test('un fallo conserva el borrador y no genera reintentos automáticos', async () => {
  const f = fixture(); f.change('8'); f.tick(); f.change('9');
  await f.reply(0, 'Conflicto'); f.tick();
  assert.equal(f.value.episode, '9'); assert.equal(f.requests.length, 1); assert.equal(f.value.saved, false);
  f.retry(); f.tick(); assert.equal(f.requests[1].expected.revision, 'v1');
});
test('rechaza límites, vacío y decimales; acepta total desconocido y refleja completado confirmado', async () => {
  const f = fixture();
  for (const n of ['', '-1', '1.5', '13']) { f.change(n); f.tick(); }
  assert.equal(f.requests.length, 0);
  f.change('12'); f.tick(); await f.reply(0); assert.equal(f.value.status, 'completed');
  const unknown = fixture(0); unknown.change('120'); unknown.tick(); assert.equal(unknown.requests[0].edit.episode, 120);
});
