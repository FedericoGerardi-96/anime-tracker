import { NextResponse } from "next/server";
import { createAniListOAuthRequest, getMissingAniListConfiguration } from "@/lib/anilist-oauth";
import { getAuthenticatedUser } from "@/services/supabase";
import { oauthReturnPath } from "@/lib/oauth-return-path";

export async function GET(request: Request) {
  const returnTo = oauthReturnPath(new URL(request.url).searchParams.get("returnTo"));
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  const missing = getMissingAniListConfiguration();
  if (missing.length) {
    const url = new URL(returnTo, request.url);
    url.search = new URLSearchParams({ anilist: "configuration_error", anilistMissing: missing.join(", ") }).toString();
    return NextResponse.redirect(url);
  }
  const { url, state } = createAniListOAuthRequest();
  const response = NextResponse.redirect(url);
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, maxAge: 600, path: "/api/anilist" };
  response.cookies.set("anilist_oauth_state", state, options);
  response.cookies.set("anilist_oauth_user", user.id, options);
  response.cookies.set("anilist_oauth_return", returnTo, options);
  return response;
}
