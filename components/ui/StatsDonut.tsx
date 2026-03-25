const STATUSES = [
  { key: "watching",      label: "Watching",       color: "#6366f1" },
  { key: "completed",     label: "Completed",      color: "#22c55e" },
  { key: "on_hold",       label: "On Hold",        color: "#eab308" },
  { key: "dropped",       label: "Dropped",        color: "#ef4444" },
  { key: "plan_to_watch", label: "Plan to Watch",  color: "#64748b" },
];

const R = 36;
const C = 2 * Math.PI * R;

export default function StatsDonut({ stats }: { stats: Record<string, number> | null }) {
  if (!stats) {
    return (
      <p className="text-sm text-slate-500 text-center py-2">Login to see your stats</p>
    );
  }

  const total = Object.values(stats).reduce((a, b) => a + b, 0);

  if (total === 0) {
    return (
      <p className="text-sm text-slate-500 text-center py-2">No anime tracked yet</p>
    );
  }

  let runningLen = 0;
  const segments = STATUSES.map(s => {
    const count = stats[s.key] || 0;
    const segLen = (count / total) * C;
    const dashoffset = C - runningLen;
    runningLen += segLen;
    return { ...s, count, segLen, dashoffset };
  }).filter(s => s.count > 0);

  return (
    <div>
      {/* Donut chart */}
      <div className="relative flex justify-center mb-5">
        <svg width="120" height="120" viewBox="0 0 80 80" className="-rotate-90">
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
            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">Total</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2">
        {STATUSES.filter(s => (stats[s.key] || 0) > 0).map(s => (
          <div key={s.key} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-xs text-slate-500">{s.label}</span>
            </div>
            <span className="text-xs font-bold">{stats[s.key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
