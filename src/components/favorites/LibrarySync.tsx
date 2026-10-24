"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Dropdown from "@/components/dropdown/dropdown";
import type { PublicAniListSyncJob as SyncJob, SyncProvider } from "@/interfaces/anilist-sync";

const names = { anilist: "AniList", myanimelist: "MyAnimeList" };
const active = (job: SyncJob) => job.status === "running" || job.status === "queued";
interface SyncContextValue { jobs: SyncJob[]; open: (provider: SyncProvider) => void }
const SyncContext = createContext<SyncContextValue | null>(null);

export function LibrarySyncProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [isOpen, setOpen] = useState(false);
  const [provider, setProvider] = useState<SyncProvider>("anilist");
  const [selection, setSelection] = useState({ anime: true, manga: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [workerOnline, setWorkerOnline] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const previous = useRef<SyncJob[]>([]);
  const version = useRef(0);
  const refresh = useRef<() => void>(() => {});

  const accept = useCallback((next: SyncJob[]) => {
    if (next.some((job) => !active(job) && previous.current.some((old) => old.id === job.id && active(old)))) router.refresh();
    previous.current = next;
    setJobs(next);
  }, [router]);

  useEffect(() => {
    const supabase = createClient();
    let disposed = false;
    let userId: string | undefined;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let connected = false;
    let inFlight = false;
    let dirty = false;
    let generation = 0;
    let controller: AbortController | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function reload() {
      if (disposed || !userId) return;
      if (inFlight) { dirty = true; return; }
      clearTimeout(timer);
      inFlight = true;
      const requestGeneration = generation;
      const currentVersion = version.current;
      controller = new AbortController();
      try {
        const response = await fetch("/api/library/sync", { cache: "no-store", signal: controller.signal });
        const data = response.ok ? await response.json() : null;
        if (!disposed && requestGeneration === generation && currentVersion === version.current) {
          if (response.status === 401) accept([]);
          else if (response.ok) { accept(data.jobs); setWorkerOnline(data.workerOnline); setConnectionLost(false); }
          else setConnectionLost(true);
        }
      } catch {
        if (!disposed && requestGeneration === generation) setConnectionLost(true);
      } finally {
        inFlight = false;
        if (!disposed && userId) {
          if (dirty || requestGeneration !== generation || currentVersion !== version.current) {
            dirty = false;
            void reload();
          } else {
            // Reconcile missed events; idle healthy connections only read every five minutes.
            timer = setTimeout(() => void reload(), connected ? previous.current.some(active) ? 60000 : 300000 : 30000);
          }
        }
      }
    }
    refresh.current = () => void reload();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (disposed || userId === session?.user.id) return;
      userId = session?.user.id;
      generation++;
      connected = false;
      controller?.abort();
      clearTimeout(timer);
      if (channel) void supabase.removeChannel(channel);
      channel = undefined;
      previous.current = [];
      setJobs([]);
      setWorkerOnline(false);
      setConnectionLost(false);
      if (!userId) return;
      const channelGeneration = generation;
      channel = supabase.channel(`library-sync:${userId}`, { config: { private: true } })
        .on("broadcast", { event: "changed" }, () => {
          if (!disposed && channelGeneration === generation) void reload();
        })
        .subscribe((status) => {
          if (disposed || channelGeneration !== generation) return;
          connected = status === "SUBSCRIBED";
          if (connected) void reload(); // Includes reconnects after missed notifications.
          else {
            clearTimeout(timer);
            timer = setTimeout(() => void reload(), 30000);
          }
        });
      // Do not await Supabase calls inside the auth callback.
      queueMicrotask(() => void reload());
    });
    const reconcile = () => { if (document.visibilityState === "visible") void reload(); };
    window.addEventListener("online", reconcile);
    window.addEventListener("focus", reconcile);
    return () => {
      disposed = true;
      refresh.current = () => {};
      subscription.unsubscribe();
      controller?.abort();
      clearTimeout(timer);
      if (channel) void supabase.removeChannel(channel);
      window.removeEventListener("online", reconcile);
      window.removeEventListener("focus", reconcile);
    };
  }, [accept]);

  useEffect(() => {
    if (isOpen) {
      dialog.current?.showModal();
      if (dialog.current) dialog.current.scrollTop = 0;
      const overflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = overflow; };
    }
    dialog.current?.close();
  }, [isOpen]);

  function open(selected: SyncProvider) {
    setProvider(selected); setError(""); setOpen(true); refresh.current();
  }
  function minimize() { setOpen(false); }

  async function mutate(url: string, body?: unknown) {
    version.current++;
    setBusy(true); setError("");
    try {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo procesar la solicitud.");
      accept([data.job, ...previous.current.filter((job) => job.provider !== data.job.provider)]);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo procesar la solicitud."); }
    finally { version.current++; setBusy(false); refresh.current(); }
  }

  function download(job: SyncJob) {
    const report = [`Sincronización AniTrack ↔ ${names[job.provider]}`, job.message,
      `Importadas: ${job.imported} | Exportadas: ${job.exported} | Actualizadas: ${job.updated} | Omitidas: ${job.skipped}`,
      `Sin cambios: ${job.unchanged ?? 0}`,
      "", "Avisos (hasta 100):", ...job.warnings].join("\n");
    const url = URL.createObjectURL(new Blob([report], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `sync-${job.provider}-${job.id}.txt`; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const renderJob = (job: SyncJob) => (
    <section key={job.id} className="rounded-2xl border border-border p-4" aria-label={`Progreso de ${names[job.provider]}`}>
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{names[job.provider]}</h3><span className={`rounded-full px-3 py-1 text-xs font-semibold ${active(job) ? "bg-sky-500/10 text-sky-400" : job.status === "error" ? "bg-red-500/10 text-red-400" : "bg-muted text-muted-foreground"}`}>{job.cancelRequested && active(job) ? "Cancelando…" : { queued: "En cola", running: "En curso", complete: "Completada", error: "Requiere atención", cancelled: "Cancelada" }[job.status]}</span></div>
          <p role="status" className="mt-3 text-sm text-muted-foreground">{job.cancelRequested && active(job) ? "Se detendrá al finalizar la operación en curso. Lo ya sincronizado se conserva." : active(job) && !workerOnline ? "Esperando al proceso de sincronización en segundo plano." : job.message}</p>
          {active(job) && <progress className="mt-4 h-2 w-full overflow-hidden rounded-full accent-primary [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary" aria-label={`Avance de ${names[job.provider]}`} max={job.total || undefined} value={job.total ? job.current : undefined} />}
          {active(job) && job.total > 0 && <p className="mt-1 text-right text-xs text-muted-foreground">{job.current} de {job.total} en esta etapa</p>}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{[["Importadas", job.imported], ["Exportadas", job.exported], ["Actualizadas", job.updated], ["Omitidas", job.skipped]].map(([label, count]) => <div key={label} className="rounded-xl bg-muted/60 p-3 text-center"><strong className="block text-lg">{count}</strong><span className="text-xs text-muted-foreground">{label}</span></div>)}</div>
          {(job.unchanged ?? 0) > 0 && <p className="mt-3 text-xs text-muted-foreground">{job.unchanged} series ya coinciden y no necesitan cambios.</p>}
          {active(job) && job.attempts > 0 && <p className="mt-3 text-xs text-amber-500">Reintento {job.attempts} de 8 · próximo intento: {new Date(job.nextRunAt).toLocaleTimeString("es-AR")}</p>}
          <p className="mt-3 text-xs text-muted-foreground">{active(job) ? "Último avance: " : "Actualizado: "}<time dateTime={job.updatedAt}>{new Date(job.updatedAt).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}</time></p>
          {job.warnings.length > 0 && <details className="mt-3 text-sm text-muted-foreground"><summary className="cursor-pointer">Ver avisos y series omitidas</summary><ul className="mt-2 max-h-40 space-y-1 overflow-auto text-xs">{job.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></details>}
          <div className="mt-4 flex flex-wrap justify-end gap-3">
            <button type="button" onClick={() => download(job)} className="cursor-pointer rounded-xl border border-border px-3 py-2 text-xs font-semibold transition hover:bg-muted">Descargar informe</button>
            {active(job) && <button type="button" disabled={busy || job.cancelRequested} onClick={() => void mutate(`/api/library/sync/${job.id}/cancel`)} className="cursor-pointer rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/20 disabled:cursor-wait disabled:opacity-50">{job.cancelRequested ? "Cancelando…" : "Cancelar sincronización"}</button>}
          </div>
    </section>
  );

  const runningJobs = jobs.filter(active);
  const finishedJobs = jobs.filter((job) => !active(job)).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const running = runningJobs.length > 0;
  const selectedJob = jobs.find((job) => job.provider === provider);
  return <SyncContext.Provider value={{ jobs, open }}>
    {children}
    {running && !isOpen && <button type="button" onClick={() => open(jobs.find(active)!.provider)} aria-label="Abrir progreso de sincronización en curso" aria-haspopup="dialog" className="fixed bottom-5 right-5 z-[200] flex cursor-pointer items-center gap-2 rounded-full border border-primary/30 bg-card p-4 text-primary shadow-xl transition hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
      <span className="material-symbols-outlined animate-spin">sync</span>
      <span className="hidden text-sm font-bold sm:inline">Sincronizaciones</span>
      <span aria-label="En curso" className="absolute right-0 top-0 size-3 animate-pulse rounded-full border-2 border-background bg-sky-400" />
    </button>}
    <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); minimize(); }} onClose={minimize} onClick={(event) => { if (event.target === event.currentTarget) minimize(); }} aria-labelledby="library-sync-title" className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-3xl border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4 border-b border-border p-5 sm:p-6">
        <div><h2 id="library-sync-title" className="text-xl font-bold">Sincronizaciones</h2><p className="mt-1 text-sm text-muted-foreground">{running ? "El trabajo sigue en segundo plano. Podés minimizar este panel." : "Elegí qué bibliotecas querés comparar y sincronizar."}</p></div>
        <button type="button" onClick={minimize} aria-label="Minimizar panel de sincronización" className="cursor-pointer rounded-xl border border-border p-2 transition hover:bg-muted"><span className="material-symbols-outlined block">remove</span></button>
      </div>
      <div className="space-y-5 p-5 sm:p-6">
        <section className="rounded-2xl border border-border p-4">
          <h3 className="font-bold">Nueva sincronización</h3>
          <div className="mt-3 text-sm"><p className="mb-2">Plataforma</p><Dropdown ariaLabel="Plataforma de sincronización" value={provider} disabled={busy} onChange={(value) => { setProvider(value as SyncProvider); setError(""); }} options={[{ value: "anilist", label: "AniList" }, { value: "myanimelist", label: "MyAnimeList" }]} className="!w-full" buttonClassName="!w-full rounded-xl bg-card py-3" menuClassName="!w-full" /></div>
          <div className="my-4 flex gap-6">{(["anime", "manga"] as const).map((type) => <label key={type} className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={selection[type]} disabled={busy} onChange={(event) => setSelection((current) => ({ ...current, [type]: event.target.checked }))} className="size-4 accent-primary" />{type === "anime" ? "Anime" : "Manga"}</label>)}</div>
          <p className="text-xs text-muted-foreground">Se comparan tus bibliotecas y se aplican solo las diferencias. No se eliminan favoritos.</p>
          {error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}
          <div className="mt-4 flex justify-end"><button type="button" disabled={busy || running || (!selection.anime && !selection.manga)} onClick={() => void mutate("/api/library/sync", { provider, ...selection })} className="cursor-pointer rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Procesando…" : selectedJob?.status === "cancelled" || selectedJob?.status === "error" ? "Reevaluar y sincronizar" : `Sincronizar con ${names[provider]}`}</button></div>
          {running && <p className="mt-2 text-right text-xs text-muted-foreground">Esperá o cancelá el trabajo activo para iniciar otro.</p>}
        </section>
        {connectionLost && <p role="status" className="text-sm text-amber-500">No pudimos actualizar el estado. Mostramos el último avance conocido.</p>}
        {runningJobs.length > 0 && <section aria-labelledby="active-sync-title" className="space-y-3"><h3 id="active-sync-title" className="text-sm font-bold text-foreground">En curso</h3>{runningJobs.map(renderJob)}</section>}
        {finishedJobs.length > 0 && <details className="group rounded-2xl border border-border"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-semibold text-muted-foreground transition hover:text-foreground"><span>Últimos resultados ({finishedJobs.length})</span><span aria-hidden="true" className="material-symbols-outlined text-lg transition-transform group-open:rotate-180">expand_more</span></summary><div className="space-y-3 px-4 pb-4"><p className="text-xs text-muted-foreground">Último resultado de cada plataforma.</p>{finishedJobs.map(renderJob)}</div></details>}

      </div>
      <div className="flex justify-end border-t border-border px-6 py-4"><button type="button" onClick={minimize} className="cursor-pointer rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">Minimizar</button></div>
    </dialog>
  </SyncContext.Provider>;
}

export default function LibrarySyncButton({ provider }: { provider: SyncProvider }) {
  const context = useContext(SyncContext);
  if (!context) return null;
  const running = context.jobs.some((job) => job.provider === provider && active(job));
  return <button type="button" onClick={() => context.open(provider)} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/20"><span className={`material-symbols-outlined text-lg ${running ? "animate-spin" : ""}`}>sync</span>{running ? `Ver progreso de ${names[provider]}` : `Sincronizar con ${names[provider]}`}</button>;
}
