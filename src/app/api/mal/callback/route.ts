import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { exchangeMalAuthorizationCode, getMalCurrentUser } from "@/lib/myanimelist-oauth";
import { saveMalConnection } from "@/services/myanimelist-connection";
import { getAuthenticatedUser } from "@/services/supabase";

type CallbackFailure = "token_error" | "identity_error" | "storage_error";

class MalCallbackError extends Error {
  constructor(readonly result: CallbackFailure, cause: unknown) {
    super(`OAuth de MyAnimeList falló en la etapa ${result}`, { cause });
  }
}

async function completeMalConnection(userId: string, code: string, verifier: string): Promise<void> {
  const tokens = await exchangeMalAuthorizationCode(code, verifier)
    .catch((error: unknown) => { throw new MalCallbackError("token_error", error); });
  const malUser = await getMalCurrentUser(tokens.access_token)
    .catch((error: unknown) => { throw new MalCallbackError("identity_error", error); });
  await saveMalConnection(userId, malUser, tokens)
    .catch((error: unknown) => { throw new MalCallbackError("storage_error", error); });
}

function profileRedirect(request: NextRequest, result: string) {
  const url = new URL("/profile", request.url);
  url.searchParams.set("mal", result);
  const response = NextResponse.redirect(url);
  response.cookies.delete("mal_oauth_state");
  response.cookies.delete("mal_code_verifier");
  return response;
}

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return profileRedirect(request, "session_expired");

  const code = request.nextUrl.searchParams.get("code");
  const returnedState = request.nextUrl.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("mal_oauth_state")?.value;
  const verifier = cookieStore.get("mal_code_verifier")?.value;

  if (!code || !returnedState || returnedState !== expectedState || !verifier) {
    return profileRedirect(request, "invalid_state");
  }

  try {
    await completeMalConnection(user.id, code, verifier);
    return profileRedirect(request, "connected");
  } catch (error) {
    console.error("No se pudo completar OAuth con MyAnimeList:", error);
    const result = error instanceof MalCallbackError ? error.result : "storage_error";
    return profileRedirect(request, result);
  }
}
