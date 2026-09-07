import Link from "next/link";
import type { MalConnectionStatus } from "@/interfaces/myanimelist-auth";

interface MalConnectionCardProps {
  connection: MalConnectionStatus;
  result?: string;
  missingConfiguration?: string;
}

const RESULT_MESSAGES: Record<string, { text: string; error?: boolean }> = {
  connected: { text: "Tu cuenta de MyAnimeList quedó conectada correctamente." },
  disconnected: { text: "Desconectaste tu cuenta de MyAnimeList." },
  configuration_error: { text: "La conexión con MyAnimeList todavía no está configurada.", error: true },
  connection_error: { text: "No pudimos completar la conexión con MyAnimeList.", error: true },
  token_error: { text: "MyAnimeList no pudo intercambiar el código de autorización.", error: true },
  identity_error: { text: "MyAnimeList autorizó el acceso, pero no pudimos identificar la cuenta.", error: true },
  storage_error: { text: "La cuenta fue autorizada, pero no pudimos guardar la conexión en Supabase.", error: true },
  invalid_state: { text: "La autorización venció o no pudo verificarse. Intentá nuevamente.", error: true },
  session_expired: { text: "Tu sesión de AniTrack venció. Iniciá sesión nuevamente.", error: true },
  disconnect_error: { text: "No pudimos desconectar la cuenta en este momento.", error: true },
};

export default function MalConnectionCard({ connection, result, missingConfiguration }: Readonly<MalConnectionCardProps>) {
  const message = result ? RESULT_MESSAGES[result] : undefined;
  const needsReconnect = connection.status === "reconnect_required";

  return (
    <div className="glass-card max-w-2xl overflow-hidden rounded-2xl border border-border">
      {message && (
        <div className={`border-b px-5 py-3 text-sm ${message.error ? "border-red-500/20 bg-red-500/10 text-red-400" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"}`}>
          {message.text}
          {result === "configuration_error" && missingConfiguration && (
            <span className="mt-1 block font-mono text-xs">Falta: {missingConfiguration}</span>
          )}
        </div>
      )}

      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#2e51a2] text-sm font-black tracking-tight text-white shadow-lg shadow-[#2e51a2]/20">
          MAL
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-text-primary">MyAnimeList</h4>
            <span className={`size-2 rounded-full ${connection.connected && !needsReconnect ? "bg-emerald-500" : "bg-slate-400"}`} />
          </div>
          {connection.connected ? (
            <>
              <p className="mt-1 text-sm text-text-muted">
                {needsReconnect ? "Es necesario volver a autorizar la cuenta" : `Conectado como ${connection.username}`}
              </p>
              <p className="mt-1 text-xs text-text-muted/75">
                El acceso se renovará automáticamente; no tendrás que iniciar sesión todos los días.
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-text-muted">No hay una cuenta vinculada.</p>
              <p className="mt-1 text-xs text-text-muted/75">
                La conexión es opcional y solo se utilizará para sincronizar tu biblioteca.
              </p>
            </>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {(!connection.connected || needsReconnect) && (
            <Link href="/api/mal/connect" className="rounded-xl bg-[#2e51a2] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#3b63bd]">
              {needsReconnect ? "Volver a conectar" : "Conectar cuenta"}
            </Link>
          )}
          {connection.connected && !needsReconnect && (
            <button disabled className="cursor-not-allowed rounded-xl bg-primary/10 px-4 py-2.5 text-sm font-bold text-primary opacity-60" title="Disponible en la próxima etapa">
              Sincronizar próximamente
            </button>
          )}
          {connection.connected && (
            <form action="/api/mal/disconnect" method="post">
              <button type="submit" className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-muted transition hover:border-red-500/40 hover:text-red-400">
                Desconectar
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
