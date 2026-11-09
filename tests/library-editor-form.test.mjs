import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as editor from '../src/lib/library-editor.ts';

// Exercise the component's handlers/effects with controlled network responses and time.
// This hook harness does not replace browser checks of React scheduling or focus.
function fixture() {
  const slots = [], timers = new Map(), effects = [], requests = [], notices = [];
  const toast = Object.fromEntries(['success', 'error', 'warning'].map(kind => [kind, (message, action) => notices.push({ kind, message, action })]));
  let cursor = 0, timerId = 0, tree;
  const same = (a, b) => a?.length === b.length && b.every((item, index) => Object.is(item, a[index]));
  const hooks = {
    useRef(initial) {
      const index = cursor++;
      slots[index] ??= { current: initial };
      return slots[index];
    },
    useState(initial) {
      const index = cursor++;
      slots[index] ??= { value: initial };
      return [slots[index].value, value => { slots[index].value = typeof value === 'function' ? value(slots[index].value) : value; }];
    },
    useTransition() {
      const [pending, setPending] = hooks.useState(false);
      return [pending, action => { setPending(true); action().finally(() => setPending(false)); }];
    },
    useCallback(fn, deps) {
      const index = cursor++;
      if (!same(slots[index]?.deps, deps)) slots[index] = { value: fn, deps };
      return slots[index].value;
    },
    useEffect(fn, deps) {
      const index = cursor++;
      if (!same(slots[index]?.deps, deps)) {
        slots[index]?.cleanup?.();
        slots[index] = { deps };
        effects.push(() => { slots[index].cleanup = fn(); });
      }
    },
  };
  const snapshot = { exists: true, revision: 'v1', status: 'watching', episode: 3, total: 24, note: '', tags: [], watchLink: '' };
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync('src/components/lists/LibraryEditorForm.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(source, {
    exports, setTimeout(fn) { timers.set(++timerId, fn); return timerId; }, clearTimeout(id) { timers.delete(id); },
    confirm: () => false,
    require(name) {
      if (name === 'react') return hooks;
      if (name === '@/components/ui/Toast') return { useToast: () => toast };
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
      if (name === '@/lib/library-editor') return editor;
      if (name === '@/lib/utils') return { slugify: value => value };
      if (name === '@/lib/actions/library-editor') return {
        saveLibraryEditor: (id, expected, edit) => new Promise(resolve => requests.push({ expected, edit, resolve })),
      };
      return { default: name };
    },
  });
  const props = { row: { id: 'media', title: 'Serie', type: 'anime', malId: 1 }, initialSnapshot: snapshot, open: true, onSaved() {}, onClose() { props.open = false; }, onReopen() { props.open = true; } };
  function render() { cursor = 0; tree = exports.default(props); effects.splice(0).forEach(effect => effect()); }
  function nodes(node) {
    if (Array.isArray(node)) return node.flatMap(item => nodes(item));
    if (!node || typeof node !== 'object') return [];
    return [node, ...nodes(node.props?.children)];
  }
  const get = label => nodes(tree).find(node => node.props?.['aria-label'] === label);
  render();
  return {
    requests, timers, get, notices,
    isOpen: () => props.open,
    alerts: () => nodes(tree).filter(node => node.props?.role === 'alert'),
    reopen() { props.onReopen(); render(); },
    dismiss() { nodes(tree).find(node => node.props?.label === 'Editar Serie').props.onClose(); render(); },
    note(value) { nodes(tree).find(node => node.type === 'textarea').props.onChange({ target: { value } }); render(); },
    currentNote: () => nodes(tree).find(node => node.type === 'textarea')?.props.value,
    submitMetadata() { nodes(tree).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); render(); },
    click(label) { const button = get(label); assert.ok(!button.props.disabled); button.props.onClick(); render(); },
    input(value) { get('Episodio actual').props.onChange({ target: { value } }); render(); },
    tick() { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(fn => fn()); render(); },
    async respond(index, error) {
      const request = requests[index];
      request.resolve(error ? { error } : { data: { ...snapshot, ...(request.edit.kind === 'progress' ? { episode: request.edit.episode } : { note: request.edit.note, watchLink: request.edit.watchLink, tags: request.edit.tags }), revision: 'v' + (index + 2) } });
      await new Promise(resolve => setImmediate(resolve)); render();
    },
  };
}

test('agrupa clics rápidos y serializa el último episodio sin perder cambios durante una escritura', async () => {
  const f = fixture();
  for (let i = 0; i < 5; i++) f.click('Sumar un episodio');
  assert.equal(f.get('Episodio actual').props.value, '8');
  assert.equal(f.requests.length, 0);
  f.tick();
  assert.equal(f.requests[0].edit.episode, 8);
  f.click('Sumar un episodio'); f.click('Sumar un episodio');
  f.tick();
  assert.equal(f.requests.length, 1);
  await f.respond(0);
  assert.equal(f.get('Episodio actual').props.value, '10');
  f.tick();
  assert.equal(f.requests[1].expected.revision, 'v2');
  assert.equal(f.requests[1].edit.episode, 10);
  await f.respond(1);
  assert.equal(f.get('Episodio actual').props.value, '10');
  assert.equal(f.timers.size, 0);
});

test('cerrar antes del debounce mantiene el guardado y permite reabrir con el valor confirmado', async () => {
  const f = fixture();
  f.input('12');
  f.click('Cerrar editor');
  assert.equal(f.isOpen(), false);
  assert.equal(f.get('Episodio actual'), undefined);
  f.tick();
  assert.equal(f.requests[0].edit.episode, 12);
  await f.respond(0);
  f.reopen();
  assert.equal(f.get('Episodio actual').props.value, '12');
  assert.equal(f.requests.length, 1);
});

test('cerrar con una solicitud en curso conserva el último cambio pendiente y muestra errores fuera del panel', async () => {
  const f = fixture();
  f.input('10'); f.tick();
  f.input('11');
  // The native dialog uses this same callback for Escape and backdrop clicks.
  f.dismiss();
  assert.equal(f.isOpen(), false);
  await f.respond(0); f.tick();
  assert.equal(f.requests[1].edit.episode, 11);
  assert.equal(f.requests[1].expected.revision, 'v2');
  await f.respond(1, 'Sin conexión');
  assert.equal(f.alerts().length, 0);
  assert.equal(f.notices.at(-1).kind, 'error');
  assert.equal(f.notices.at(-1).action.label, 'Volver a editar');
  f.reopen();
  assert.equal(f.get('Episodio actual').props.value, '11');
  assert.equal(f.timers.size, 0);
});

test('el botón cerrar sigue habilitado durante una solicitud', async () => {
  const f = fixture();
  f.input('8'); f.tick();
  f.click('Cerrar editor');
  assert.equal(f.isOpen(), false);
  await f.respond(0);
  assert.equal(f.notices.length, 1);
  assert.equal(f.notices[0].kind, 'success');
  f.reopen();
  assert.equal(f.get('Episodio actual').props.value, '8');
  f.dismiss();
  assert.equal(f.notices.length, 1);
});

test('cerrar conserva metadatos sin enviar y tampoco interrumpe su guardado explícito', async () => {
  const f = fixture();
  f.note('Para ver juntos'); f.dismiss(); f.tick();
  assert.equal(f.requests.length, 0);
  f.reopen();
  assert.equal(f.currentNote(), 'Para ver juntos');
  f.submitMetadata(); f.click('Cerrar editor');
  assert.equal(f.isOpen(), false);
  assert.equal(f.requests[0].edit.note, 'Para ver juntos');
  await f.respond(0); f.reopen();
  assert.equal(f.currentNote(), 'Para ver juntos');
});

test('input directo valida vacío, negativos, fracciones y límite; fallo conserva borrador sin bucle de reintentos', async () => {
  const f = fixture();
  for (const value of ['', '-1', '1.5', '25']) {
    f.input(value); f.tick();
    assert.equal(f.get('Episodio actual').props['aria-invalid'], true);
    assert.equal(f.requests.length, 0);
  }
  f.input('24'); f.tick();
  assert.equal(f.requests[0].edit.episode, 24);
  assert.equal(f.get('Sumar un episodio').props.disabled, true);
  await f.respond(0, 'Sin conexión');
  f.tick();
  assert.equal(f.requests.length, 1);
  assert.equal(f.get('Episodio actual').props.value, '24');
  f.click('Restar un episodio'); f.tick();
  assert.equal(f.requests[1].edit.episode, 23);
  assert.equal(f.requests[1].expected.revision, 'v1');
});
