import type { AniListConnectionStatus } from "@/services/anilist-connection";
import ConnectionNotice from "@/components/profile/ConnectionNotice";
import AniListSyncButton from "@/components/favorites/AniListSync";

const messages: Record<string, string> = {
  connected: "Tu cuenta de AniList quedó conectada correctamente.",
  disconnected: "Desconectaste tu cuenta de AniList de AniTrack.",
  configuration_error: "Falta configurar la conexión con AniList.",
  invalid_state: "La autorización venció o no pudo verificarse. Intentá nuevamente.",
  denied: "No autorizaste la conexión con AniList.",
  session_expired: "Tu sesión venció. Iniciá sesión nuevamente.",
  token_error: "No se pudo intercambiar el código de autorización con AniList.",
  identity_error: "AniList autorizó el acceso, pero no pudimos identificar tu cuenta.",
  storage_error: "La cuenta fue autorizada, pero no se pudo guardar. Revisá la migración de Supabase y la clave de cifrado.",
  disconnect_error: "No pudimos desconectar la cuenta. Intentá nuevamente.",
};

export default function AniListConnectionCard({ connection, result, missing }: {
  connection: AniListConnectionStatus; result?: string; missing?: string;
}) {
  const success = result === "connected" || result === "disconnected";
  return <div className="glass-card mt-4 max-w-2xl overflow-hidden rounded-2xl border border-border">
    {result && messages[result] && <ConnectionNotice key={result} provider="anilist" result={result} error={!success}>
      {messages[result]}
      {result === "configuration_error" && missing && <span className="mt-1 block text-xs">Variables pendientes: {missing}</span>}
    </ConnectionNotice>}
    <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#02a9ff] text-sm font-black text-white">AL</div>
      <div className="min-w-0 flex-1">
        <h4 className="font-bold text-text-primary">AniList</h4>
        <p className="mt-1 text-sm text-text-muted">{connection.connected ? `Conectado como ${connection.username}` : "No hay una cuenta vinculada."}</p>
        <p className="mt-1 text-xs text-text-muted">{connection.needsReconnect ? "El acceso venció. Volvé a autorizar tu cuenta." : connection.connected ? "Tu cuenta está vinculada. Podés sincronizar tus bibliotecas en segundo plano." : "Conectá tu cuenta para sincronizar tus bibliotecas."}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {connection.connected && !connection.needsReconnect && <AniListSyncButton />}
        {(!connection.connected || connection.needsReconnect) && <a href="/api/anilist/connect" className="rounded-xl bg-[#02a9ff] px-4 py-2.5 text-sm font-bold text-white">{connection.needsReconnect ? "Volver a conectar" : "Conectar cuenta"}</a>}
        {connection.connected && <form action="/api/anilist/disconnect" method="post"><button type="submit" className="cursor-pointer rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:border-red-500/60 hover:bg-red-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400">Desconectar</button></form>}
      </div>
    </div>
  </div>;
}
