import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FriendsClient from "@/components/friends/FriendsClient";
import type { SocialConnection } from "@/types/social";
import { getProfileImagesByUser } from "@/services/profile-images";

export default async function FriendsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data, error } = await supabase.rpc("get_my_social_connections");
  const connections = (data ?? []) as SocialConnection[];
  const images = error ? null : await getProfileImagesByUser(connections.map(connection => connection.user_id));

  return (
    <main className="mx-auto w-full py-10">
      <div className="mb-9">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
          Comunidad
        </p>
        <h1 className="mt-2 text-4xl font-black sm:text-6xl">Amigos</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Encontrá personas, administrá solicitudes y descubrí sus historias
          favoritas.
        </p>
      </div>
      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-400">
          No pudimos cargar tus conexiones: {error.message}
        </div>
      ) : (
        <FriendsClient
          initialConnections={connections.map(connection => ({
            ...connection, avatar: images?.get(connection.user_id)?.avatar ?? connection.avatar,
          }))}
        />
      )}
    </main>
  );
}
