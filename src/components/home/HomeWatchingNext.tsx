"use client";

import { useEffect, useState } from "react";
import { formatHomeAiringTime } from "@/lib/home-airing";

export default function HomeWatchingNext({ episode, airingAt, fallback }: Readonly<{ episode: number; airingAt: number; fallback: string }>) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  if (now === null) return <p className="mt-1 text-xs text-muted-foreground">Cargando horario…</p>;
  if (airingAt * 1000 <= now) return <p className="mt-1 text-xs text-muted-foreground">{fallback}</p>;
  return <p className="mt-1 text-xs text-muted-foreground">Próximo episodio {episode} · <time dateTime={new Date(airingAt * 1000).toISOString()}>{formatHomeAiringTime(airingAt)}</time></p>;
}
