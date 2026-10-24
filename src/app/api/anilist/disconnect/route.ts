import { NextResponse } from "next/server";
import { deleteAniListConnection } from "@/services/anilist-connection";
import { getAuthenticatedUser } from "@/services/supabase";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return new NextResponse(null, { status: 403 });
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);
  try {
    await deleteAniListConnection(user.id);
    return NextResponse.redirect(new URL("/profile?anilist=disconnected", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/profile?anilist=disconnect_error", request.url), 303);
  }
}
