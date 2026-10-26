import type { PublicAniListSyncJob } from '@/interfaces/anilist-sync';

export interface SyncBatch { jobs: PublicAniListSyncJob[]; nextPollMs?: number }

/** One request at a time. No recurring requests when idle, hidden or offline. */
export function createBrowserSyncRunner(options: {
  request: (step: boolean) => Promise<SyncBatch>;
  canRun: () => boolean;
  onJobs: (jobs: PublicAniListSyncJob[]) => void;
  onError: (lost: boolean) => void;
  schedule?: typeof setTimeout;
  cancel?: typeof clearTimeout;
}) {
  const schedule = options.schedule ?? setTimeout;
  const cancel = options.cancel ?? clearTimeout;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  let inFlight = false;
  let readNext = true;
  let revision = 0;
  let hasWork = false;

  function pause() { cancel(timer); timer = undefined; }

  async function run() {
    if (disposed || inFlight || !options.canRun()) return;
    pause();
    inFlight = true;
    const currentRevision = revision;
    const step = !readNext && hasWork;
    readNext = false;
    let delay = 500;
    let retry = false;
    try {
      const result = await options.request(step);
      if (disposed || currentRevision !== revision) return;
      hasWork = result.jobs.some(job => job.status === 'queued' || job.status === 'running');
      options.onJobs(result.jobs);
      options.onError(false);
      delay = Math.max(500, result.nextPollMs ?? 500);
    } catch (error) {
      if (disposed || currentRevision !== revision) return;
      if (error instanceof Error && 'status' in error && error.status === 401) {
        hasWork = false;
        options.onJobs([]);
        options.onError(false);
      } else {
        options.onError(true);
        retry = true;
        readNext = true; // Reconcile a step whose response may have been lost.
        delay = 10_000;
      }
    } finally {
      inFlight = false;
      if (!disposed && options.canRun() && (hasWork || retry || readNext)) {
        timer = schedule(() => { void run(); }, currentRevision !== revision ? 0 : delay);
      }
    }
  }

  return {
    refresh() { revision++; readNext = true; pause(); void run(); },
    pause,
    dispose() { disposed = true; pause(); },
  };
}
