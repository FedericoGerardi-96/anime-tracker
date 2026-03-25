"use client";

import { useState, useTransition } from "react";
import { updateShowHContent } from "@/lib/actions/profile";

export default function HContentToggle({ enabled }: { enabled: boolean }) {
  const [checked, setChecked] = useState(enabled);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const next = !checked;
    setChecked(next);
    startTransition(async () => {
      await updateShowHContent(next);
    });
  }

  return (
    <div className="glass-card p-5 rounded-2xl flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-primary">lock</span>
        <div>
          <p className="text-sm font-bold">Adult Content</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Show the Hentai Vault section in the sidebar
          </p>
        </div>
      </div>
      <button
        onClick={handleToggle}
        disabled={isPending}
        aria-checked={checked}
        role="switch"
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-60 ${
          checked ? "bg-primary" : "bg-slate-300 dark:bg-slate-700"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
