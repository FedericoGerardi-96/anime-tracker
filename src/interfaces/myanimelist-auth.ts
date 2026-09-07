export interface MalOAuthTokenResponse {
  token_type: "Bearer";
  expires_in: number;
  access_token: string;
  refresh_token: string;
}

export interface MalCurrentUser {
  id: number;
  name: string;
  picture?: string;
}

export interface MalConnectionStatus {
  connected: boolean;
  username?: string;
  avatarUrl?: string;
  status?: "active" | "reconnect_required";
  lastSyncedAt?: string;
}

export interface MalConnectionTokenRow {
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  token_expires_at: string;
}
