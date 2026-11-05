"use client";

import { useEffect, useState } from "react";
import { homeLocalDate } from "@/lib/home-greeting";

export default function HomeLocalDate() {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  if (now === null) return <span aria-hidden="true" className="block h-4" />;
  const { label, dateTime } = homeLocalDate(now);
  return <time dateTime={dateTime} className="block text-xs font-bold uppercase tracking-[0.18em] text-primary">{label}</time>;
}
