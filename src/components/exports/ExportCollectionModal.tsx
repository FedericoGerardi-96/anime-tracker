'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import Modal from '@/components/ui/Modal';
import { columnsFor, defaultExportFields, exportCell, exportThemes, moveExportField, parseExportDataset, sampleExportRows, type ExportField, type ExportSource } from '@/lib/library-export';
import type { Theme } from '@/lib/theme';

class ExportDownloadError extends Error {}

export default function ExportCollectionModal({ source, onClose }: { source: ExportSource; onClose: () => void }) {
  const available = columnsFor(source);
  const [order, setOrder] = useState<ExportField[]>(() => available.map(column => column.key));
  const [selected, setSelected] = useState<ExportField[]>(() => defaultExportFields(source));
  const [theme, setTheme] = useState<Theme>(() => {
    const current = document.documentElement.dataset.theme;
    return current === 'aurora-clara' || current === 'estreno' ? current : 'aurora-nocturna';
  });
  const [samples] = useState(() => sampleExportRows(source));
  const [dragging, setDragging] = useState<ExportField | null>(null);
  const [dropTarget, setDropTarget] = useState<ExportField | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const controller = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const fields = order.filter(key => selected.includes(key));
  const colors = exportThemes[theme];
  const previewColumns = fields.flatMap(field => { const column = available.find(item => item.key === field); return column ? [column] : []; });
  const control = 'inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30';

  function move(field: ExportField, target: ExportField) {
    setOrder(current => moveExportField(current, field, target));
    setAnnouncement(`Se movió ${available.find(column => column.key === field)?.label}.`);
  }
  function drag(event: PointerEvent<HTMLOListElement>) {
    const field = dragging;
    if (!field || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const list = listRef.current;
    if (list) {
      const bounds = list.getBoundingClientRect();
      if (event.clientY > bounds.bottom - 35) list.scrollBy(0, 12);
      else if (event.clientY < bounds.top + 35) list.scrollBy(0, -12);
    }
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-export-column]')?.getAttribute('data-export-column');
    const column = available.find(item => item.key === target);
    setDropTarget(column && column.key !== field ? column.key : null);
  }
  function drop(event: PointerEvent<HTMLOListElement>) {
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-export-column]')?.getAttribute('data-export-column');
    const column = available.find(item => item.key === target);
    if (dragging && column && column.key !== dragging) move(dragging, column.key);
    setDragging(null); setDropTarget(null);
  }
  function close() { controller.current?.abort(); onClose(); }
  async function download() {
    if (controller.current || !fields.length) return;
    const current = new AbortController(); controller.current = current;
    setBusy(true); setError(''); setResult(''); setProgress('Leyendo tu colección…');
    try {
      const response = await fetch(`/api/library/export?source=${source}`, { cache: 'no-store', signal: current.signal });
      if (!response.ok) throw new ExportDownloadError(response.status === 401 ? 'Iniciá sesión para descargar tu colección.' : 'No pudimos leer toda tu colección. Reintentá la descarga.');
      const data = parseExportDataset(await response.json(), source);
      if (!data.rows.length) throw new ExportDownloadError('Tu colección está vacía. Agregá un título antes de exportar.');
      const { createExportWorkbook } = await import('@/lib/export-workbook');
      let imageResult: Awaited<ReturnType<typeof import('@/lib/export-images').loadExportImages>> | undefined;
      if (fields.includes('image')) {
        const { loadExportImages } = await import('@/lib/export-images');
        imageResult = await loadExportImages(data.rows, current.signal, (done, total) => setProgress(`Preparando portadas: ${done} de ${total}…`));
      }
      current.signal.throwIfAborted(); setProgress('Generando el archivo…');
      const workbook = await createExportWorkbook(data, { fields, theme }, imageResult?.images);
      const buffer = await workbook.xlsx.writeBuffer(); current.signal.throwIfAborted();
      const blob = new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob), anchor = document.createElement('a');
      anchor.href = url; anchor.download = `anitrack-${source === 'library' ? 'biblioteca' : 'hentai'}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
      const missingImages = imageResult?.failed ?? 0;
      setResult(`Se inició la descarga de ${data.rows.length} títulos.${missingImages === 1 ? ' No se pudo incorporar una portada; su URL quedó en el archivo.' : missingImages > 1 ? ` No se pudieron incorporar ${missingImages} portadas; sus URL quedaron en el archivo.` : ''}`);
    } catch (failure) {
      if (!current.signal.aborted) setError(failure instanceof ExportDownloadError ? failure.message : 'No pudimos generar el Excel. Revisá tu conexión y volvé a intentar.');
    } finally {
      if (!current.signal.aborted) { setBusy(false); setProgress(''); }
      if (controller.current === current) controller.current = null;
    }
  }

  return <Modal onClose={close} label="Personalizar exportación a Excel">
    <section className="flex max-h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-(--radius-panel) border border-border bg-card shadow-2xl" onClick={event => event.stopPropagation()}>
      <header className="flex items-start justify-between gap-4 border-b border-border p-5 sm:px-7">
        <div><h2 className="text-xl font-bold">Tu Excel, a tu manera</h2><p className="mt-2 text-sm text-muted-foreground">{source === 'library' ? 'Toda tu biblioteca y tus colecciones propias' : 'Toda tu colección de Hentai'}, sin filtros ni límite de página.</p></div>
        <button type="button" onClick={close} aria-label="Cerrar exportación" className={control}><span aria-hidden="true" className="material-symbols-outlined">close</span></button>
      </header>
      <div className="min-h-0 space-y-6 overflow-y-auto p-5 sm:p-7">
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <section className="min-w-0" aria-label="Columnas del archivo">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">1. Elegí y ordená las columnas</h3><button type="button" disabled={busy} onClick={() => { setOrder(available.map(column => column.key)); setSelected(defaultExportFields(source)); }} className="min-h-11 text-xs font-semibold text-primary underline disabled:opacity-40">Restablecer</button></div>
            <p className="mb-3 text-xs text-muted-foreground">Arrastrá desde el asa o usá las flechas. Desmarcar una columna solo la quita del archivo.</p>
            <fieldset disabled={busy}>
              <legend className="sr-only">Seleccionar columnas</legend>
              <ol ref={listRef} onPointerMove={drag} onPointerUp={drop} onPointerCancel={() => { setDragging(null); setDropTarget(null); }} className="max-h-80 overflow-y-auto rounded-xl border border-border">
                {order.map((field, index) => {
                  const column = available.find(item => item.key === field);
                  if (!column) return null;
                  return <li key={field} data-export-column={field} className={`flex items-center gap-1 border-b border-border px-2 last:border-0 ${dragging === field ? 'bg-accent' : 'bg-background'} ${dropTarget === field ? 'outline-2 -outline-offset-2 outline-primary' : ''}`}>
                    <button type="button" disabled={busy} className={control + ' touch-none cursor-grab active:cursor-grabbing'} aria-label={`Arrastrar ${column.label}`} title="Arrastrá para cambiar el orden"
                      onPointerDown={event => { if (event.button !== 0) return; listRef.current?.setPointerCapture(event.pointerId); setDragging(field); }}
                      onKeyDown={event => { if (event.key === 'ArrowUp' && index > 0) { event.preventDefault(); move(field, order[index - 1]); } else if (event.key === 'ArrowDown' && index < order.length - 1) { event.preventDefault(); move(field, order[index + 1]); } }}>
                      <span aria-hidden="true" className="text-lg">⠿</span>
                    </button>
                    <label className="flex min-h-12 min-w-0 flex-1 cursor-pointer items-center gap-3 py-2 text-sm"><input type="checkbox" className="size-4 shrink-0 accent-primary" checked={selected.includes(field)} onChange={event => setSelected(current => event.target.checked ? [...current, field] : current.filter(key => key !== field))} />{column.label}</label>
                    <button type="button" disabled={busy || index === 0} className={control} aria-label={`Subir ${column.label}`} onClick={() => move(field, order[index - 1])}><span aria-hidden="true">↑</span></button>
                    <button type="button" disabled={busy || index === order.length - 1} className={control} aria-label={`Bajar ${column.label}`} onClick={() => move(field, order[index + 1])}><span aria-hidden="true">↓</span></button>
                  </li>;
                })}
              </ol>
            </fieldset>
            <button type="button" disabled={busy} onClick={() => setSelected(available.map(column => column.key))} className="mt-1 min-h-11 text-xs font-semibold text-primary underline disabled:opacity-40">Incluir todos los campos</button>
          </section>
          <div className="min-w-0 space-y-5">
            <fieldset disabled={busy} className="space-y-3"><legend className="mb-3 font-semibold">2. Elegí el tema del encabezado</legend>
              {(Object.entries(exportThemes) as [Theme, typeof colors][]).map(([value, option]) => <label key={value} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${theme === value ? 'border-primary bg-accent' : 'border-border bg-background'}`}>
                <input type="radio" name="export-theme" value={value} checked={theme === value} onChange={() => setTheme(value)} className="size-4 accent-primary" />
                <span aria-hidden="true" className="inline-flex h-8 w-14 items-center justify-center rounded text-xs font-bold" style={{ background: option.background, color: option.foreground }}>Aa</span>{option.label}
              </label>)}
            </fieldset>
            <div className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground"><p>Se descarga un archivo .xlsx con tus datos guardados en AniTrack.</p><p className="mt-2">{source === 'library' ? '«Mi estado» es tu seguimiento. El puntaje corresponde al catálogo.' : 'Hentai incluye sus datos propios; no tiene puntaje ni estado personal guardados.'}</p><p className="mt-2">La portada es opcional. Si no puede incorporarse, se conserva su URL.</p></div>
          </div>
        </div>
        <section className="min-w-0" aria-label="Vista previa del Excel">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2"><h3 className="font-semibold">3. Vista previa</h3><p className="text-xs text-muted-foreground">Tres títulos de ejemplo · {fields.length} columnas · Fechas en UTC</p></div>
          {fields.length ? <div className="max-w-full overflow-x-auto rounded-xl border border-border" tabIndex={0} role="region" aria-label="Desplazar vista previa de las columnas">
            <table className="w-full border-collapse text-left text-xs" style={{ minWidth: Math.max(480, fields.length * 160) }}>
              <caption className="sr-only">Ejemplo del orden y colores del archivo descargado</caption>
              <thead style={{ background: colors.background, color: colors.foreground }}><tr>{previewColumns.map(column => <th key={column.key} scope="col" className="p-3 font-bold">{column.label}</th>)}</tr></thead>
              <tbody>{samples.map((sample, index) => <tr key={sample.id} style={{ background: index % 2 ? '#f5f3fd' : '#ffffff', color: '#16132a' }}>{previewColumns.map(column => {
                const value = exportCell(sample, column);
                return <td key={column.key} className="max-w-64 border-t border-black/10 p-3 align-middle"><div className="line-clamp-3">{column.key === 'image' ? <span className="inline-flex h-16 w-11 items-center justify-center rounded bg-[#eeebfa] text-[9px] font-semibold text-[#4b4767]">PORTADA</span> : value instanceof Date ? new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC' }).format(value) : value ?? '—'}</div></td>;
              })}</tr>)}</tbody>
            </table>
          </div> : <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">Elegí al menos una columna para ver y descargar el archivo.</p>}
        </section>
        <p className="sr-only" role="status">{announcement}</p>
        {error && <p role="alert" className="rounded-xl border border-border bg-background p-4 text-sm">{error}</p>}
        {result && <p role="status" className="rounded-xl border border-border bg-background p-4 text-sm">{result}</p>}
      </div>
      <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-border p-4 sm:px-7">
        <p role="status" className="mr-auto text-xs text-muted-foreground">{busy ? progress : `${fields.length} columnas seleccionadas`}</p>
        <button type="button" onClick={close} className="min-h-11 rounded-(--radius-control) border border-border px-4 text-sm font-semibold">{busy ? 'Cancelar descarga' : 'Cerrar'}</button>
        <button type="button" disabled={busy || !fields.length} onClick={download} className="min-h-11 rounded-(--radius-control) bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-40">{busy ? 'Preparando…' : 'Descargar Excel'}</button>
      </footer>
    </section>
  </Modal>;
}
