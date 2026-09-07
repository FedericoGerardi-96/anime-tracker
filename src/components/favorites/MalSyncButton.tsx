"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { LibrarySyncProgress } from "@/interfaces/myanimelist-sync";

const INITIAL_PROGRESS: LibrarySyncProgress = {
  type: "progress",
  phase: "loading",
  message: "Preparando la sincronización…",
  imported: 0,
  exported: 0,
  reconciled: 0,
};

export default function MalSyncButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showSelection, setShowSelection] = useState(true);
  const [selection, setSelection] = useState({ anime: true, manga: true });
  const [progress, setProgress] = useState<LibrarySyncProgress>(INITIAL_PROGRESS);

  useEffect(() => {
    if (!isRunning) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [isRunning]);

  async function synchronize() {
    setProgress(INITIAL_PROGRESS);
    setShowSelection(false);
    setIsRunning(true);

    try {
      const response = await fetch("/api/mal/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selection),
      });
      if (!response.ok || !response.body) throw new Error("No se pudo iniciar la sincronización.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = "";

      while (true) {
        const { value, done } = await reader.read();
        pending += decoder.decode(value, { stream: !done });
        const lines = pending.split("\n");
        pending = lines.pop() ?? "";
        for (const line of lines) {
          if (line.trim()) setProgress(JSON.parse(line) as LibrarySyncProgress);
        }
        if (done) break;
      }
      if (pending.trim()) setProgress(JSON.parse(pending) as LibrarySyncProgress);
    } catch (error) {
      setProgress({
        ...INITIAL_PROGRESS,
        type: "error",
        phase: "error",
        message: error instanceof Error ? error.message : "Ocurrió un error inesperado.",
      });
    } finally {
      setIsRunning(false);
    }
  }

  const determinate = Boolean(progress.total && progress.total > 0 && progress.current !== undefined);
  const percentage = determinate ? Math.min(100, Math.round((progress.current! / progress.total!) * 100)) : 0;
  const finished = progress.type === "complete" || progress.type === "error";

  function close() {
    if (isRunning) return;
    setIsOpen(false);
    setShowSelection(true);
    if (progress.type === "complete") router.refresh();
  }

  function downloadReport() {
    const labels = {
      imported: "IMPORTADOS A ANITRACK",
      exported: "EXPORTADOS A MYANIMELIST",
      updated_in_anitrack: "PROGRESO ACTUALIZADO EN ANITRACK",
      updated_in_mal: "PROGRESO ACTUALIZADO EN MYANIMELIST",
    } as const;
    const sections = Object.entries(labels).map(([action, label]) => {
      const titles = (progress.details ?? []).filter((item) => item.action === action).map((item) => `- [${item.mediaType === "anime" ? "Anime" : "Manga"}] ${item.title}`);
      return `${label}\n${titles.length ? titles.join("\n") : "- Ninguno"}`;
    });
    const content = [
      "INFORME DE SINCRONIZACIÓN ANITRACK ↔ MYANIMELIST",
      `Fecha: ${new Date().toLocaleString("es-AR")}`,
      "",
      ...sections.flatMap((section) => [section, ""]),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `anitrack-sync-${new Date().toISOString().slice(0, 10)}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setProgress(INITIAL_PROGRESS); setShowSelection(true); setIsOpen(true); }}
        className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/20"
      >
        <span className="material-symbols-outlined text-lg">sync</span>
        Sincronizar con MyAnimeList
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="mal-sync-title">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-background p-6 shadow-2xl sm:p-8">
            <div className="flex items-start gap-4">
              <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${progress.type === "error" ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary"}`}>
                <span className="material-symbols-outlined block text-2xl leading-none">
                  {progress.type === "complete" ? "check_circle" : progress.type === "error" ? "error" : "sync"}
                </span>
              </span>
              <div>
                <h2 id="mal-sync-title" className="text-xl font-black text-foreground">
                  {showSelection ? "¿Qué querés sincronizar?" : progress.type === "complete" ? "Bibliotecas sincronizadas" : progress.type === "error" ? "No se pudo sincronizar" : "Sincronizando bibliotecas"}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{showSelection ? "Podés actualizar una biblioteca o ambas." : progress.message}</p>
              </div>
            </div>

            {showSelection ? (
              <div className="mt-6 space-y-3">
                {(["anime", "manga"] as const).map((type) => (
                  <label key={type} className="flex cursor-pointer items-center gap-4 rounded-2xl border border-border p-4 transition hover:bg-muted/50">
                    <input type="checkbox" checked={selection[type]} onChange={(event) => setSelection((current) => ({ ...current, [type]: event.target.checked }))} className="size-5 accent-primary" />
                    <span className="material-symbols-outlined text-primary">{type === "anime" ? "live_tv" : "menu_book"}</span>
                    <span><strong className="block text-foreground">{type === "anime" ? "Anime" : "Manga"}</strong><span className="text-xs text-muted-foreground">Sincronizar favoritos, estado y {type === "anime" ? "episodios vistos" : "capítulos leídos"}</span></span>
                  </label>
                ))}
                <div className="flex justify-end gap-3 pt-3">
                  <button type="button" onClick={close} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">Cancelar</button>
                  <button type="button" disabled={!selection.anime && !selection.manga} onClick={synchronize} className="rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40">Sincronizar</button>
                </div>
              </div>
            ) : <><div className="mt-6 h-2 overflow-hidden rounded-full bg-muted">
              {determinate ? (
                <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${percentage}%` }} />
              ) : (
                !finished && <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
              )}
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-muted/60 p-3"><strong className="block text-lg text-foreground">{progress.imported}</strong><span className="text-xs text-muted-foreground">Importadas</span></div>
              <div className="rounded-2xl bg-muted/60 p-3"><strong className="block text-lg text-foreground">{progress.exported}</strong><span className="text-xs text-muted-foreground">Exportadas</span></div>
              <div className="rounded-2xl bg-muted/60 p-3"><strong className="block text-lg text-foreground">{progress.reconciled}</strong><span className="text-xs text-muted-foreground">Actualizadas</span></div>
            </div>

            {isRunning && <p className="mt-5 text-center text-xs text-muted-foreground">No cierres ni recargues esta página hasta que termine.</p>}
            {finished && (
              <div className="mt-6 flex justify-end gap-3">
                {progress.type === "complete" && <button type="button" onClick={downloadReport} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"><span className="material-symbols-outlined text-lg">download</span>Descargar informe</button>}
                {progress.type === "error" && <button type="button" onClick={synchronize} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">Reintentar</button>}
                <button type="button" onClick={close} className="rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:brightness-110">Cerrar</button>
              </div>
            )}
            </>}
          </div>
        </div>
      )}
    </>
  );
}
