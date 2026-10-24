"use client";

import { useEffect, useState, type ReactNode } from "react";

export default function ConnectionNotice({ provider, result, error, children }: {
  provider: "mal" | "anilist";
  result: string;
  error: boolean;
  children: ReactNode;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Consume the callback result so reloads and copied URLs don't replay it.
    const url = new URL(window.location.href);
    if (url.searchParams.get(provider) === result) {
      url.searchParams.delete(provider);
      url.searchParams.delete(provider === "mal" ? "missing" : "anilistMissing");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }
    const timeout = window.setTimeout(() => setVisible(false), 10000);
    return () => window.clearTimeout(timeout);
  }, [provider, result]);

  if (!visible) return null;
  return <div role={error ? "alert" : "status"} className={`flex items-start gap-3 border-b px-5 py-3 text-sm ${error ? "border-red-500/20 bg-red-500/10 text-red-400" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"}`}>
    <div className="min-w-0 flex-1">{children}</div>
    <button type="button" onClick={() => setVisible(false)} aria-label="Cerrar aviso" className="cursor-pointer rounded px-1 font-bold transition hover:bg-current/10 focus-visible:outline-2 focus-visible:outline-offset-2">×</button>
  </div>;
}
