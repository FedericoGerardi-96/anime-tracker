import Link from "next/link";
import LibrarySyncButton from "@/components/favorites/LibrarySync";
import ConnectionNotice from "@/components/profile/ConnectionNotice";
import type { MalConnectionStatus } from "@/interfaces/myanimelist-auth";
import type { AniListConnectionStatus } from "@/services/anilist-connection";
import type { FavoritesSearchParams } from "@/interfaces/favorites-service";

function Feedback({ provider, result }: { provider: "mal" | "anilist"; result?: string }) {
  if (!result) return null;
  const name = provider === "mal" ? "MyAnimeList" : "AniList";
  const messages: Record<string, string> = {
    connected: `Tu cuenta de ${name} quedó conectada. Ya podés sincronizar tu biblioteca.`,
    configuration_error: `La conexión con ${name} todavía no está configurada. Revisá la configuración desde tu perfil.`,
    invalid_state: "La autorización venció o no pudo verificarse. Volvé a conectar la cuenta.",
    denied: `No autorizaste la conexión con ${name}. Podés intentarlo nuevamente.`,
    session_expired: "Tu sesión venció. Iniciá sesión nuevamente.",
    token_error: `No pudimos completar la autorización de ${name}. Intentá nuevamente.`,
    identity_error: `${name} autorizó el acceso, pero no pudimos identificar tu cuenta.`,
    storage_error: "La cuenta fue autorizada, pero no pudimos guardar la conexión. Intentá nuevamente.",
    connection_error: `No pudimos conectar tu cuenta de ${name}. Intentá nuevamente.`,
  };
  if (!messages[result]) return null;
  return <ConnectionNotice provider={provider} result={result} error={result !== "connected"}>{messages[result]}</ConnectionNotice>;
}

export default function LibraryConnectionsCard({ mal, anilist, results }: {
  mal: MalConnectionStatus; anilist: AniListConnectionStatus; results: FavoritesSearchParams;
}) {
  const accounts = [
    { provider: "myanimelist" as const, name: "MyAnimeList", short: "MAL", path: "mal", connected: mal.connected, username: mal.username, reconnect: mal.status === "reconnect_required", color: "bg-[#2e51a2]" },
    { provider: "anilist" as const, name: "AniList", short: "AL", path: "anilist", connected: anilist.connected, username: anilist.username, reconnect: Boolean(anilist.needsReconnect), color: "bg-[#02a9ff]" },
  ];
  return <section aria-labelledby="library-connections-title" className="mb-8 overflow-hidden rounded-2xl border border-border bg-card">
    <Feedback key={`mal-${results.mal}`} provider="mal" result={results.mal} />
    <Feedback key={`anilist-${results.anilist}`} provider="anilist" result={results.anilist} />
    <div className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3"><span aria-hidden="true" className="material-symbols-outlined rounded-xl bg-primary/10 p-2 text-primary">sync</span><h2 id="library-connections-title" className="text-lg font-bold text-foreground">Tus bibliotecas conectadas</h2></div>
        <Link href="/profile" className="text-xs font-semibold text-muted-foreground transition hover:text-primary">Administrar cuentas →</Link>
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">Tus favoritos y cambios de progreso se envían automáticamente a las cuentas conectadas. Usá la sincronización completa para traer cambios hechos en esas plataformas y revisar las diferencias entre bibliotecas.</p>
      <div className="mt-5 grid gap-3 xl:grid-cols-2">
        {accounts.map((account) => <div key={account.provider} className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-background/40 p-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden="true" className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-xs font-black text-white ${account.color}`}>{account.short}</span>
            <div className="min-w-0"><h3 className="text-sm font-bold text-foreground">{account.name}</h3><p className={`mt-1 text-xs ${account.reconnect ? "text-amber-500" : "text-muted-foreground"}`}>{account.reconnect ? "La conexión venció. Volvé a autorizar tu cuenta." : account.connected ? `Conectado como ${account.username}` : "Conectá tu cuenta para mantener tu biblioteca al día."}</p></div>
          </div>
          <div className="shrink-0">
            {account.connected && !account.reconnect ? <LibrarySyncButton provider={account.provider} /> : <a href={`/api/${account.path}/connect?returnTo=/favorites`} className={`inline-flex cursor-pointer items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${account.color}`}>{account.reconnect ? "Volver a conectar" : `Conectar ${account.name}`}</a>}
          </div>
        </div>)}
      </div>
    </div>
  </section>;
}
