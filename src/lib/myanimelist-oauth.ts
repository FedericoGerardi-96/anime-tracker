import "server-only";

import { randomBytes } from "node:crypto";
import type { MalCurrentUser, MalOAuthTokenResponse } from "@/interfaces/myanimelist-auth";

const MAL_AUTHORIZE_URL = "https://myanimelist.net/v1/oauth2/authorize";
const MAL_TOKEN_URL = "https://myanimelist.net/v1/oauth2/token";
const MAL_API_URL = "https://api.myanimelist.net/v2";

const MAL_INTEGRATION_VARIABLES = [
  "MAL_CLIENT_ID",
  "MAL_CLIENT_SECRET",
  "MAL_REDIRECT_URI",
  "MAL_TOKEN_ENCRYPTION_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export function getMissingMalIntegrationVariables(): string[] {
  return MAL_INTEGRATION_VARIABLES.filter((name) => !process.env[name]?.trim());
}

export function getMalIntegrationConfigurationIssues(): string[] {
  const issues = getMissingMalIntegrationVariables().map((name) => `Falta ${name}`);
  const serverKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (serverKey?.startsWith("sb_publishable_")) {
    issues.push("SUPABASE_SERVICE_ROLE_KEY contiene una clave publishable; debe ser secret/service_role");
  }

  return issues;
}

function getOAuthCredentials() {
  const clientId = process.env.MAL_CLIENT_ID?.trim();
  const clientSecret = process.env.MAL_CLIENT_SECRET?.trim();
  const redirectUri = process.env.MAL_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Falta configurar MAL_CLIENT_ID, MAL_CLIENT_SECRET o MAL_REDIRECT_URI");
  }
  return { clientId, clientSecret, redirectUri };
}

export function createMalOAuthRequest(): { url: string; state: string; verifier: string } {
  const { clientId, redirectUri } = getOAuthCredentials();
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(64).toString("base64url");
  const url = new URL(MAL_AUTHORIZE_URL);

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", verifier);
  url.searchParams.set("code_challenge_method", "plain");

  return { url: url.toString(), state, verifier };
}

async function requestTokens(body: URLSearchParams): Promise<MalOAuthTokenResponse> {
  const response = await fetch(MAL_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`MyAnimeList rechazó la autorización (${response.status})`);
  return response.json() as Promise<MalOAuthTokenResponse>;
}

export function exchangeMalAuthorizationCode(code: string, verifier: string) {
  const { clientId, clientSecret, redirectUri } = getOAuthCredentials();
  return requestTokens(new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  }));
}

export function refreshMalTokens(refreshToken: string) {
  const { clientId, clientSecret } = getOAuthCredentials();
  return requestTokens(new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  }));
}

export async function getMalCurrentUser(accessToken: string): Promise<MalCurrentUser> {
  const response = await fetch(`${MAL_API_URL}/users/@me?fields=id,name,picture`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`No se pudo identificar la cuenta de MyAnimeList (${response.status})`);
  return response.json() as Promise<MalCurrentUser>;
}
