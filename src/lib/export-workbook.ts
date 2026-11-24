import type { Workbook } from 'exceljs';
import { columnsFor, exportCell, exportThemes, validExportSettings, type ExportDataset, type ExportSettings } from './library-export';
import { safeWatchLink } from './library-editor';

export interface ExportImage { base64: string; width: number; height: number }
export async function createExportWorkbook(dataset: ExportDataset, settings: ExportSettings, images: ReadonlyMap<string, ExportImage> = new Map()): Promise<Workbook> {
  if (!validExportSettings(settings, dataset.source)) throw new Error('Elegí al menos una columna válida.');
  if (dataset.rows.length > 1048575) throw new Error('La colección supera el límite de filas de Excel.');
  const excelModule = await import('exceljs');
  const workbook = new (excelModule.default ?? excelModule).Workbook();
  workbook.creator = 'AniTrack'; workbook.created = new Date();
  const sheet = workbook.addWorksheet(dataset.source === 'library' ? 'Mi biblioteca' : 'Hentai', { views: [{ state: 'frozen', ySplit: 1 }] });
  const available = columnsFor(dataset.source);
  const columns = settings.fields.map(field => {
    const column = available.find(item => item.key === field);
    if (!column) throw new Error('Columna inválida.');
    return column;
  });
  sheet.columns = columns.map(column => ({ key: column.key, header: column.label, width: column.width }));
  const theme = exportThemes[settings.theme];
  const imageIds = new Map<string, number>();
  const header = sheet.getRow(1); header.height = 32;
  header.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + theme.background.slice(1).toUpperCase() } };
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF' + theme.foreground.slice(1).toUpperCase() } };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
  for (const [index, data] of dataset.rows.entries()) {
    const values = columns.map(column => {
      const value = column.key === 'image' ? null : exportCell(data, column);
      if (typeof value === 'string' && value.length > 32767) throw new Error('Una celda supera el límite de texto de Excel.');
      return value;
    });
    const row = sheet.addRow(values);
    row.height = columns.some(column => column.key === 'image') ? 78 : 48;
    columns.forEach((column, columnIndex) => {
      const cell = row.getCell(columnIndex + 1);
      cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF16132A' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: index % 2 ? 'FFF5F3FD' : 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', wrapText: true };
      if (column.date) cell.numFmt = 'dd/mm/yyyy hh:mm';
      if (column.numeric) cell.numFmt = column.key === 'score' ? '0.0' : '0';
      if (column.key === 'image') {
        const url = typeof data.image === 'string' ? safeWatchLink(data.image) : null;
        const image = url ? images.get(url) : null;
        if (image && url) {
          let imageId = imageIds.get(url);
          if (imageId === undefined) {
            imageId = workbook.addImage({ base64: image.base64, extension: 'jpeg' });
            imageIds.set(url, imageId);
          }
          sheet.addImage(imageId, { tl: { col: columnIndex + 0.08, row: index + 1.06 }, ext: { width: image.width, height: image.height }, editAs: 'oneCell' });
        } else cell.value = url;
      }
    });
  }
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, dataset.rows.length + 1), column: columns.length } };
  sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  return workbook;
}
