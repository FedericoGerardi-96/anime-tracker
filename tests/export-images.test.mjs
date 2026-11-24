import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function loader(fetch) {
  const exports = {};
  const code = ts.transpileModule(readFileSync('src/lib/export-images.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(code, { exports, fetch, Blob, AbortSignal, Uint8Array, URL, createImageBitmap: async () => ({ width: 400, height: 600, close() {} }), document: { createElement: () => ({ getContext: () => ({ fillRect() {}, drawImage() {} }), toDataURL: () => 'data:image/jpeg;base64,preview' }) }, require: () => ({ safeWatchLink: value => { try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; } } }) });
  return exports.loadExportImages;
}
test('descarga portadas una vez, limita concurrencia y conserva los fallos para avisar', async () => {
  let active = 0, maximum = 0, calls = 0;
  const read = loader(async (url, init) => {
    assert.equal(init.credentials, 'omit'); calls++; active++; maximum = Math.max(maximum, active);
    await new Promise(resolve => setTimeout(resolve, 10)); active--;
    return new Response('image', { status: url.endsWith('/missing') ? 404 : 200, headers: { 'Content-Type': 'image/jpeg' } });
  });
  const rows = [1, 2, 3, 4].map(index => ({ image: `https://example.test/${index}` }));
  rows.push(rows[0], { image: 'https://example.test/missing' }, { image: 'javascript:alert(1)' });
  const result = await read(rows, new AbortController().signal, () => {});
  assert.equal(calls, 5); assert.equal(maximum, 3); assert.equal(result.images.size, 4); assert.equal(result.failed, 1);
  assert.ok([...result.images.values()].every(image => image.width <= 80 && image.height <= 88));
});
test('rechaza contenido ajeno a imágenes y respuestas demasiado grandes', async () => {
  const read = loader(async url => new Response('body', { headers: { 'Content-Type': url.endsWith('/html') ? 'text/html' : 'image/jpeg', 'Content-Length': url.endsWith('/large') ? String(6 * 1024 * 1024) : '4' } }));
  const result = await read([{ image: 'https://example.test/html' }, { image: 'https://example.test/large' }], new AbortController().signal, () => {});
  assert.equal(result.failed, 2); assert.equal(result.images.size, 0);
});
test('cancelar detiene el trabajo y no convierte la cancelación en un fallo de portada', async () => {
  const controller = new AbortController(); controller.abort();
  const read = loader(async () => { assert.fail('No debe salir una petición'); });
  await assert.rejects(read([{ image: 'https://example.test/cover' }], controller.signal, () => {}), { name: 'AbortError' });
});
