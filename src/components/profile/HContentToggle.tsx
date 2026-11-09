"use client";

import { useState, useTransition } from "react";
import { updateShowHContent } from "@/lib/actions/profile";
import styles from "@/components/settings/AppearanceSettings.module.css";

export default function HContentToggle({ enabled }: Readonly<{ enabled: boolean }>) {
  const [checked, setChecked] = useState(enabled);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const next = !checked;
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await updateShowHContent(next);
        if (result.success) {
          setChecked(next);
          setMessage({ text: next ? "Contenido adulto activado." : "Contenido adulto desactivado." });
          return;
        }
      } catch {
        // Keep the last saved value if the request fails.
      }
      setMessage({ text: "No pudimos guardar tu preferencia. Intentá de nuevo.", error: true });
    });
  }

  return (
    <div className="max-w-lg rounded-(--radius-panel) border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p id="adult-content-label" className="text-sm font-bold">Mostrar contenido adulto</p>
          <p id="adult-content-description" className="mt-1 text-sm text-muted-foreground">
            Agrega Hentai al menú principal.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-labelledby="adult-content-label"
          aria-describedby="adult-content-description"
          disabled={isPending}
          onClick={handleToggle}
          className={`${styles.switch} disabled:opacity-60`}
        >
          <i aria-hidden="true" />
        </button>
      </div>
      {isPending && <p role="status" className="mt-2 text-sm text-muted-foreground">Guardando…</p>}
      {message && <p role={message.error ? 'alert' : 'status'} className="mt-2 text-sm text-foreground">{message.text}</p>}
    </div>
  );
}
