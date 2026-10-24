import { NextResponse } from "next/server";
import { createMalOAuthRequest, getMalIntegrationConfigurationIssues } from "@/lib/myanimelist-oauth";
import { getAuthenticatedUser } from "@/services/supabase";
import { oauthReturnPath } from "@/lib/oauth-return-path";

export async function GET(request: Request) {
  const returnTo = oauthReturnPath(new URL(request.url).searchParams.get("returnTo"));
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const configurationIssues = getMalIntegrationConfigurationIssues();
  if (configurationIssues.length > 0) {
    const profileUrl = new URL(returnTo, request.url);
    profileUrl.searchParams.set("mal", "configuration_error");
    profileUrl.searchParams.set("missing", configurationIssues.join(" · "));
    return NextResponse.redirect(profileUrl);
  }

  try {
    const { url, state, verifier } = createMalOAuthRequest();
    const response = NextResponse.redirect(url);
    const secure = process.env.NODE_ENV === "production";
    response.cookies.set("mal_oauth_state", state, { httpOnly: true, secure, sameSite: "lax", maxAge: 600, path: "/" });
    response.cookies.set("mal_code_verifier", verifier, { httpOnly: true, secure, sameSite: "lax", maxAge: 600, path: "/" });
    response.cookies.set("mal_oauth_return", returnTo, { httpOnly: true, secure, sameSite: "lax", maxAge: 600, path: "/api/mal" });
    return response;
  } catch (error) {
    console.error("No se pudo iniciar OAuth con MyAnimeList:", error);
    const url = new URL(returnTo, request.url);
    url.searchParams.set("mal", "configuration_error");
    return NextResponse.redirect(url);
  }
}
