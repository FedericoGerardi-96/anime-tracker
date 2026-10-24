import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { exchangeAniListCode, getAniListViewer } from "@/lib/anilist-oauth";
import { saveAniListConnection } from "@/services/anilist-connection";
import { getAuthenticatedUser } from "@/services/supabase";
import { oauthReturnPath } from "@/lib/oauth-return-path";

export async function GET(request: NextRequest) {
  const store = await cookies();
  const finish = (result: string) => {
    const url = new URL(oauthReturnPath(store.get("anilist_oauth_return")?.value), request.url);
    url.searchParams.set("anilist", result);
    const response = NextResponse.redirect(url);
    for (const name of ["anilist_oauth_state", "anilist_oauth_user", "anilist_oauth_return"]) {
      response.cookies.set(name, "", { maxAge: 0, path: "/api/anilist" });
    }
    return response;
  };
  const user = await getAuthenticatedUser();
  if (!user) return finish("session_expired");
  const state = request.nextUrl.searchParams.get("state");
  if (!state || state !== store.get("anilist_oauth_state")?.value || user.id !== store.get("anilist_oauth_user")?.value) return finish("invalid_state");
  if (request.nextUrl.searchParams.has("error")) return finish("denied");
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return finish("invalid_state");
  let stage = "token_error";
  try {
    const tokens = await exchangeAniListCode(code);
    stage = "identity_error";
    const viewer = await getAniListViewer(tokens.access_token);
    stage = "storage_error";
    await saveAniListConnection(user.id, viewer, tokens);
    return finish("connected");
  } catch {
    console.error(`OAuth de AniList falló: ${stage}`);
    return finish(stage);
  }
}
