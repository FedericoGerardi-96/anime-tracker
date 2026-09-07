import type { LibrarySyncProgress } from "@/interfaces/myanimelist-sync";
import { createClient } from "@/lib/supabase/server";
import { synchronizeLibraries } from "@/services/myanimelist-sync";
import { getAuthenticatedUser } from "@/services/supabase";

export const runtime = "nodejs";
export const maxDuration = 300;

function publicErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.includes("nueva autorización")) {
    return "MyAnimeList requiere que vuelvas a conectar tu cuenta desde el perfil.";
  }
  if (error instanceof Error && error.message.includes("no conectó")) {
    return "No hay una cuenta de MyAnimeList conectada.";
  }
  return "No pudimos completar la sincronización. Tus datos existentes no fueron eliminados.";
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  const supabase = await createClient();
  const requested = await request.json().catch(() => ({ anime: true, manga: false }));
  const selection = { anime: requested.anime === true, manga: requested.manga === true };
  if (!selection.anime && !selection.manga) {
    return Response.json({ error: "Seleccioná al menos una biblioteca" }, { status: 400 });
  }
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: LibrarySyncProgress) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        await synchronizeLibraries(supabase, user.id, selection, send);
      } catch (error) {
        console.error("MyAnimeList library sync failed:", error);
        send({
          type: "error",
          phase: "error",
          message: publicErrorMessage(error),
          imported: 0,
          exported: 0,
          reconciled: 0,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "X-Accel-Buffering": "no",
    },
  });
}
