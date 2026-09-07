"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePersonalProgress } from "@/lib/actions/lists";
import { useToast } from "@/components/ui/Toast";

interface Props { mediaId: string; malId: number; mediaType: "anime" | "manga"; initialStatus?: string | null; currentEpisode?: number; onUpdated?: (status: string) => void; compact?: boolean }
const OPTIONS = [
  { value: "watching", anime: "Viendo", manga: "Leyendo" },
  { value: "completed", anime: "Completado", manga: "Completado" },
  { value: "plan_to_watch", anime: "Pendiente", manga: "Pendiente" },
  { value: "on_hold", anime: "En pausa", manga: "En pausa" },
  { value: "dropped", anime: "Abandonado", manga: "Abandonado" },
] as const;

export default function QuickStatusSelect({ mediaId, malId, mediaType, initialStatus, currentEpisode = 0, onUpdated, compact = false }: Readonly<Props>) {
  const [status, setStatus] = useState(initialStatus || "plan_to_watch");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { error, warning } = useToast();
  return <select aria-label="Cambiar estado" value={status} disabled={pending} onClick={(event) => event.stopPropagation()} onChange={(event) => {
    const previous = status;
    const next = event.target.value;
    setStatus(next);
    startTransition(async () => {
      const result = await updatePersonalProgress({ mediaId, malId, mediaType, status: next as typeof OPTIONS[number]['value'], currentEpisode });
      if (result.error) { setStatus(previous); error(result.error); return; }
      if (result.warning) warning(result.warning);
      onUpdated?.(next);
      router.refresh();
    });
  }} className={`${compact ? "max-w-32 px-2 py-1 text-[10px]" : "min-w-36 px-3 py-2 text-xs"} rounded-lg border border-primary/25 bg-slate-900 font-bold text-slate-200 outline-none transition focus:border-primary disabled:opacity-50`}>
    {OPTIONS.map((option) => <option key={option.value} value={option.value}>{mediaType === 'manga' ? option.manga : option.anime}</option>)}
  </select>;
}
