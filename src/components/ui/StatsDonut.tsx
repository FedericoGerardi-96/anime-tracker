import Link from "next/link";

const STATUSES = [
  { key: "watching",      label: "Viendo",          color: "#6366f1" },
  { key: "completed",     label: "Completados",      color: "#22c55e" },
  { key: "on_hold",       label: "En pausa",         color: "#eab308" },
  { key: "dropped",       label: "Abandonados",      color: "#ef4444" },
  { key: "plan_to_watch", label: "Pendientes",       color: "#64748b" },
];

const R = 36;
const C = 2 * Math.PI * R;

export default function StatsDonut({ stats, mediaType }: Readonly<{ stats: Record<string, number> | null; mediaType: "anime" | "manga" }>) {
  if (!stats) {
    return (
      <p className="py-2 text-center text-sm text-muted-foreground">Iniciá sesión para ver tus estadísticas</p>
    );
  }

  const total = Object.values(stats).reduce((a, b) => a + b, 0);

  if (total === 0) {
    return (
      <p className="py-2 text-center text-sm text-muted-foreground">Todavía no registraste {mediaType}</p>
    );
  }

  const { segments } = STATUSES.reduce<{ runningLen: number; segments: Array<(typeof STATUSES)[number] & { count: number; segLen: number; dashoffset: number }> }>((acc, s) => {
    const count = stats[s.key] || 0;
    const segLen = (count / total) * C;
    const dashoffset = C - acc.runningLen;
    return { runningLen: acc.runningLen + segLen, segments: count > 0 ? [...acc.segments, { ...s, count, segLen, dashoffset }] : acc.segments };
  }, { runningLen: 0, segments: [] });

  const statusLabel = (status: (typeof STATUSES)[number]) => {
    if (mediaType !== "manga") return status.label;
    if (status.key === "watching") return "Leyendo";
    if (status.key === "plan_to_watch") return "Por leer";
    return status.label;
  };

  return (
    <div>
      {/* Donut chart */}
      <div className="relative flex justify-center mb-5">
        <svg width="120" height="120" viewBox="0 0 80 80" className="-rotate-90" aria-hidden="true" focusable="false">
          <circle
            cx="40" cy="40" r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-slate-200 dark:text-slate-700"
          />
          {segments.map(s => (
            <circle
              key={s.key}
              cx="40" cy="40" r={R}
              fill="none"
              stroke={s.color}
              strokeWidth="8"
              strokeDasharray={`${s.segLen} ${C - s.segLen}`}
              strokeDashoffset={s.dashoffset}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-2xl font-black leading-none">{total}</p>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Total</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2">
        {STATUSES.filter(s => (stats[s.key] || 0) > 0).map(s => (
          <Link
            key={s.key}
            href={`/lists?tab=${s.key}&type=${mediaType}`}
            aria-label={`Ver ${mediaType} en estado ${statusLabel(s)} en Mis listas`}
            className="flex items-center justify-between rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} aria-hidden="true" />
              <span className="text-xs text-muted-foreground">{statusLabel(s)}</span>
            </div>
            <span className="text-xs font-bold">{stats[s.key]}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
