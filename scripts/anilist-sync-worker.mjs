// Run separately from the web server; no browser tab is required.
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";
import { createWakeSignal } from "./sync-wake.mjs";
const require = createRequire(import.meta.url);
const nextRequire = createRequire(require.resolve("next/package.json"));
nextRequire("@next/env").loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
const secret = process.env.ANILIST_SYNC_WORKER_SECRET;
if (!secret) throw new Error("Falta ANILIST_SYNC_WORKER_SECRET en las variables del servidor.");
const origin = process.env.ANILIST_SYNC_APP_URL || "http://localhost:3000";
const endpoint = new URL("/api/internal/anilist-sync/step", origin);
if (endpoint.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname)) throw new Error("El worker remoto requiere HTTPS.");
let running = true;
const wake = createWakeSignal();
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
// service_role can receive this private channel; browsers have no policy for it.
db.channel("library-sync:worker", { config: { private: true } })
  .on("broadcast", { event: "wake" }, () => wake.wake())
  .subscribe((status) => {
    if (status === "SUBSCRIBED") wake.wake();
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") console.warn("Broadcast no disponible. La cola se recuperará mediante la comprobación de respaldo.");
  });
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => { running = false; wake.wake(); });
console.log("Worker de sincronización iniciado (AniList y MyAnimeList). Procesará la cola aunque el navegador esté cerrado.");
while (running) {
  try {
    let pollMs = 4000;
    const response = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(65000), redirect: "error" });
    if (response.status === 401) throw new Error("El secreto del worker no coincide con el del servidor.");
    if (!response.ok) console.error(`Cola de AniList no disponible (${response.status}). Reintento en 10 segundos.`);
    else {
      const result = await response.json();
      pollMs = result.nextPollMs ?? 4000;
      if (!result.idle) console.log(`[Sync ${result.provider ?? "anilist"} · ${result.status}] ${result.message}${result.retryInSeconds ? ` Próximo intento en ${result.retryInSeconds}s.` : ""}`);
    }
    await wake.wait(response.ok ? Math.max(500, pollMs) : 10000);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "No se pudo contactar al servidor.");
    await wake.wait(10000);
  }
}
await db.removeAllChannels();
