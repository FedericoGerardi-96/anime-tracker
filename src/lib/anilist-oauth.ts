import "server-only";
import { randomBytes } from "node:crypto";

export interface AniListTokens { access_token: string; expires_in: number }
export interface AniListUser { id: number; name: string }

export function getMissingAniListConfiguration() {
  return ["ANILIST_CLIENT_ID", "ANILIST_CLIENT_SECRET", "ANILIST_REDIRECT_URI", "ANILIST_TOKEN_ENCRYPTION_KEY", "SUPABASE_SERVICE_ROLE_KEY"]
    .filter((name) => !process.env[name]?.trim());
}

function credentials() {
  const client_id = process.env.ANILIST_CLIENT_ID?.trim();
  const client_secret = process.env.ANILIST_CLIENT_SECRET?.trim();
  const redirect_uri = process.env.ANILIST_REDIRECT_URI?.trim();
  if (!client_id || !client_secret || !redirect_uri) throw new Error("Configuración OAuth incompleta");
  return { client_id, client_secret, redirect_uri };
}

export function createAniListOAuthRequest() {
  const { client_id, redirect_uri } = credentials();
  const state = randomBytes(32).toString("base64url");
  const url = new URL("https://anilist.co/api/v2/oauth/authorize");
  url.search = new URLSearchParams({ client_id, redirect_uri, response_type: "code", state }).toString();
  return { url: url.toString(), state };
}

export async function exchangeAniListCode(code: string): Promise<AniListTokens> {
  const response = await fetch("https://anilist.co/api/v2/oauth/token", {
    method: "POST", cache: "no-store",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ ...credentials(), grant_type: "authorization_code", code }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`AniList rechazó el intercambio (${response.status})`);
  const tokens = await response.json() as AniListTokens;
  if (!tokens.access_token || !Number.isFinite(tokens.expires_in) || tokens.expires_in <= 0) throw new Error("Respuesta OAuth inválida");
  return tokens;
}

export async function getAniListViewer(token: string): Promise<AniListUser> {
  const response = await fetch("https://graphql.anilist.co", {
    method: "POST", cache: "no-store",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query: "query { Viewer { id name } }" }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`AniList no pudo identificar la cuenta (${response.status})`);
  const payload = await response.json() as { data?: { Viewer?: AniListUser }; errors?: unknown[] };
  if (payload.errors?.length || !payload.data?.Viewer?.id || !payload.data.Viewer.name) throw new Error("AniList no devolvió el usuario");
  return payload.data.Viewer;
}
