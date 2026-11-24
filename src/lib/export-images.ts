import { safeWatchLink } from './library-editor';
import type { ExportRow } from './library-export';
import type { ExportImage } from './export-workbook';

const MAX_BYTES = 5 * 1024 * 1024;
async function loadImage(url: string, signal: AbortSignal): Promise<ExportImage> {
  const response = await fetch(url, { mode: 'cors', credentials: 'omit', signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]) });
  if (!response.ok || !/^image\/(jpeg|png|webp|gif)(?:;|$)/i.test(response.headers.get('content-type') ?? '')) throw new Error('Portada no disponible');
  if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('Portada demasiado grande');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Portada vacía');
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) throw new Error('Portada demasiado grande');
      chunks.push(new Uint8Array(value));
    }
  } finally { await reader.cancel().catch(() => {}); }
  const bitmap = await createImageBitmap(new Blob(chunks));
  try {
    if (bitmap.width * bitmap.height > 24_000_000 || !bitmap.width || !bitmap.height) throw new Error('Portada demasiado grande');
    const ratio = Math.min(80 / bitmap.width, 88 / bitmap.height, 1);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio)); canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo preparar la portada');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return { base64: canvas.toDataURL('image/jpeg', 0.85), width: canvas.width, height: canvas.height };
  } finally { bitmap.close(); }
}
export async function loadExportImages(rows: ExportRow[], signal: AbortSignal, onProgress: (done: number, total: number) => void): Promise<{ images: Map<string, ExportImage>; failed: number }> {
  const urls = [...new Set(rows.flatMap(row => { const url = typeof row.image === 'string' ? safeWatchLink(row.image) : null; return url ? [url] : []; }))];
  const images = new Map<string, ExportImage>(); let next = 0, done = 0, failed = 0;
  await Promise.all(Array.from({ length: Math.min(3, urls.length) }, async () => {
    for (;;) {
      signal.throwIfAborted();
      const url = urls[next++]; if (!url) return;
      try { images.set(url, await loadImage(url, signal)); }
      catch { signal.throwIfAborted(); failed++; }
      onProgress(++done, urls.length);
    }
  }));
  return { images, failed };
}
