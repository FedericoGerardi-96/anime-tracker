import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import ExcelJS from 'exceljs';
import sharp from 'sharp';

function load(file, dependencies) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(source, { exports, URL, Date, Map, Set, require(name) {
    if (name in dependencies) return dependencies[name];
    throw new Error(name);
  } }); return exports;
}
const editor = load('src/lib/library-editor.ts', {});
const helpers = load('src/lib/library-export.ts', { './library-editor': editor });
const { createExportWorkbook } = load('src/lib/export-workbook.ts', { './library-export': helpers, './library-editor': editor, exceljs: ExcelJS });

test('el XLSX real conserva orden, colores de los tres temas, tipos y texto literal', async () => {
  const rows = [{ id: '001', title: '=HYPERLINK("https://example.test")', note: '+Nota personal', score: 0, status: 'Leyendo', progress: 0, created: '2026-01-02T15:30:00Z', malId: 42 }];
  for (const theme of Object.keys(helpers.exportThemes)) {
    const workbook = await createExportWorkbook({ source: 'library', rows }, { fields: ['status', 'title', 'note', 'score', 'progress', 'created', 'id'], theme });
    const buffer = await workbook.xlsx.writeBuffer();
    const restored = new ExcelJS.Workbook(); await restored.xlsx.load(buffer);
    const sheet = restored.worksheets[0];
    assert.deepEqual(sheet.getRow(1).values.slice(1), ['Mi estado', 'Título', 'Descripción propia', 'Puntaje del catálogo', 'Episodios / capítulos vistos', 'Fecha de agregado', 'ID en AniTrack']);
    assert.equal(sheet.getCell('A1').fill.fgColor.argb, 'FF' + helpers.exportThemes[theme].background.slice(1).toUpperCase());
    assert.equal(sheet.getCell('B2').value, rows[0].title); assert.equal(sheet.getCell('B2').formula, undefined);
    assert.equal(sheet.getCell('C2').value, '+Nota personal');
    assert.equal(sheet.getCell('D2').value, 0); assert.equal(sheet.getCell('E2').value, 0);
    assert.ok(sheet.getCell('F2').value instanceof Date); assert.equal(sheet.getCell('F2').value.getTime(), Date.parse(rows[0].created));
    assert.equal(sheet.getCell('G2').value, '001'); assert.equal(sheet.views[0].ySplit, 1); assert.ok(sheet.autoFilter);
  }
});

test('el archivo incluye la imagen binaria y conserva URL cuando falta una portada', async () => {
  const jpeg = await sharp({ create: { width: 40, height: 60, channels: 3, background: '#4bf2c5' } }).jpeg().toBuffer();
  const imageUrl = 'https://example.test/cover.jpg', missingUrl = 'https://example.test/missing.jpg';
  const workbook = await createExportWorkbook({ source: 'hentai', rows: [{ id: 'h1', title: 'Con imagen', image: imageUrl }, { id: 'h2', title: 'Misma portada', image: imageUrl }, { id: 'h3', title: 'Sin imagen', image: missingUrl }] },
    { fields: ['title', 'image'], theme: 'estreno' }, new Map([[imageUrl, { base64: jpeg.toString('base64'), width: 40, height: 60 }]]));
  const restored = new ExcelJS.Workbook(); await restored.xlsx.load(await workbook.xlsx.writeBuffer());
  const sheet = restored.worksheets[0], [image] = sheet.getImages();
  assert.equal(sheet.getImages().length, 2); assert.equal(image.range.tl.col > 1, true);
  assert.equal(sheet.getImages()[1].imageId, image.imageId);
  assert.ok(restored.getImage(image.imageId).buffer.length > 100);
  assert.equal(sheet.getCell('B4').value, missingUrl);
  await assert.rejects(createExportWorkbook({ source: 'hentai', rows: [] }, { fields: ['score'], theme: 'estreno' }));
});
