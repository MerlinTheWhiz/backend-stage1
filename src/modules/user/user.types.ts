export interface GitHubUser {
  id: number;
  login: string;
  email: string | null;
  avatar_url: string;
  name: string | null;
}

export interface UserDocument {
  id: string;
  github_id: string;
  username: string;
  email: string;
  avatar_url?: string;
  role: "admin" | "analyst";
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
}

export interface JWTPayload {
  userId: string;
  githubId: string;
  username: string;
  role: "admin" | "analyst";
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
}
