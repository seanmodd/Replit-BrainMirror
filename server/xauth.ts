import crypto from "crypto";

const TOKEN_STORE: {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  userId?: string;
} = {};

const PKCE_STORE: {
  codeVerifier?: string;
  state?: string;
} = {};

function getClientCredentials() {
  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  if (!clientId) throw new Error("X_CLIENT_ID not configured");
  if (!clientSecret) throw new Error("X_CLIENT_SECRET not configured");
  return { clientId, clientSecret };
}

function getRedirectUri() {
  const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS?.split(",")[0];
  if (domain) return `https://${domain}/api/x-auth/callback`;
  return `http://localhost:5000/api/x-auth/callback`;
}

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export function getAuthorizationUrl(): string {
  const { clientId } = getClientCredentials();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = crypto.randomBytes(16).toString("hex");

  PKCE_STORE.codeVerifier = codeVerifier;
  PKCE_STORE.state = state;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    scope: "bookmark.read tweet.read users.read offline.access",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string, state: string): Promise<{ userId: string }> {
  if (state !== PKCE_STORE.state) {
    throw new Error("Invalid state parameter");
  }
  if (!PKCE_STORE.codeVerifier) {
    throw new Error("No PKCE code verifier found");
  }

  const { clientId, clientSecret } = getClientCredentials();
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: getRedirectUri(),
      code_verifier: PKCE_STORE.codeVerifier,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Token exchange failed:", errText);
    throw new Error("Failed to exchange code for tokens");
  }

  const data = await response.json();
  TOKEN_STORE.accessToken = data.access_token;
  TOKEN_STORE.refreshToken = data.refresh_token;
  TOKEN_STORE.expiresAt = Date.now() + data.expires_in * 1000;

  PKCE_STORE.codeVerifier = undefined;
  PKCE_STORE.state = undefined;

  const userResponse = await fetch("https://api.x.com/2/users/me", {
    headers: { Authorization: `Bearer ${TOKEN_STORE.accessToken}` },
  });
  if (userResponse.ok) {
    const userData = await userResponse.json();
    TOKEN_STORE.userId = userData.data.id;
  }

  return { userId: TOKEN_STORE.userId || "" };
}

async function refreshAccessToken(): Promise<void> {
  if (!TOKEN_STORE.refreshToken) {
    throw new Error("No refresh token available. Please re-authorize.");
  }

  const { clientId, clientSecret } = getClientCredentials();
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: TOKEN_STORE.refreshToken,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Token refresh failed:", errText);
    TOKEN_STORE.accessToken = undefined;
    TOKEN_STORE.refreshToken = undefined;
    TOKEN_STORE.expiresAt = undefined;
    throw new Error("Token refresh failed. Please re-authorize.");
  }

  const data = await response.json();
  TOKEN_STORE.accessToken = data.access_token;
  TOKEN_STORE.refreshToken = data.refresh_token;
  TOKEN_STORE.expiresAt = Date.now() + data.expires_in * 1000;
}

async function getValidAccessToken(): Promise<string> {
  if (!TOKEN_STORE.accessToken) {
    throw new Error("Not authorized. Please connect your X account via OAuth.");
  }

  if (TOKEN_STORE.expiresAt && Date.now() > TOKEN_STORE.expiresAt - 60000) {
    await refreshAccessToken();
  }

  return TOKEN_STORE.accessToken!;
}

export function isOAuthConnected(): boolean {
  return !!TOKEN_STORE.accessToken;
}

export function getOAuthUserId(): string | undefined {
  return TOKEN_STORE.userId;
}

export interface BookmarkTweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  conversation_id?: string;
  in_reply_to_user_id?: string;
  referenced_tweets?: { type: string; id: string }[];
  entities?: {
    urls?: { expanded_url: string }[];
    hashtags?: { tag: string }[];
    mentions?: { username: string }[];
  };
}

export interface BookmarkAuthor {
  id: string;
  name: string;
  username: string;
}

export async function fetchBookmarks(): Promise<{ tweets: BookmarkTweet[]; authors: Map<string, BookmarkAuthor> }> {
  const token = await getValidAccessToken();
  const userId = TOKEN_STORE.userId;
  if (!userId) throw new Error("User ID not available. Please re-authorize.");

  const params = new URLSearchParams({
    "tweet.fields": "created_at,conversation_id,in_reply_to_user_id,referenced_tweets,entities,author_id",
    "user.fields": "name,username",
    expansions: "author_id",
    max_results: "100",
  });

  const response = await fetch(
    `https://api.x.com/2/users/${userId}/bookmarks?${params.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error(`Bookmarks fetch failed (${response.status}):`, errText);
    if (response.status === 401) {
      try {
        await refreshAccessToken();
        return fetchBookmarks();
      } catch {
        throw new Error("Authentication expired. Please re-authorize.");
      }
    }
    if (response.status === 402) {
      throw new Error("X API credits depleted. Add credits in the X Developer Portal.");
    }
    throw new Error(`Failed to fetch bookmarks (${response.status})`);
  }

  const data = await response.json();
  const tweets: BookmarkTweet[] = data.data || [];
  const authors = new Map<string, BookmarkAuthor>();

  if (data.includes?.users) {
    for (const user of data.includes.users) {
      authors.set(user.id, user);
    }
  }

  return { tweets, authors };
}

export function getRedirectUriForDisplay(): string {
  return getRedirectUri();
}

export async function fetchUserTweets(bearerToken: string, userId: string): Promise<{ tweets: BookmarkTweet[]; authors: Map<string, BookmarkAuthor>; refTweets: Map<string, any> }> {
  const params = new URLSearchParams({
    "tweet.fields": "created_at,conversation_id,in_reply_to_user_id,referenced_tweets,entities,author_id",
    "user.fields": "name,username",
    expansions: "author_id,referenced_tweets.id,referenced_tweets.id.author_id",
    max_results: "100",
  });

  const response = await fetch(
    `https://api.x.com/2/users/${userId}/tweets?${params.toString()}`,
    { headers: { Authorization: `Bearer ${bearerToken}` } }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error(`User tweets fetch failed (${response.status}):`, errText);
    if (response.status === 402) throw new Error("X API credits depleted. Add credits in the X Developer Portal.");
    throw new Error(`Failed to fetch tweets (${response.status})`);
  }

  const data = await response.json();
  const tweets: BookmarkTweet[] = data.data || [];
  const authors = new Map<string, BookmarkAuthor>();
  if (data.includes?.users) {
    for (const user of data.includes.users) {
      authors.set(user.id, user);
    }
  }
  const refTweets = new Map<string, any>();
  if (data.includes?.tweets) {
    for (const tw of data.includes.tweets) {
      refTweets.set(tw.id, tw);
    }
  }
  return { tweets, authors, refTweets };
}

export async function fetchUserLikes(bearerToken: string, userId: string): Promise<{ tweets: BookmarkTweet[]; authors: Map<string, BookmarkAuthor> }> {
  const params = new URLSearchParams({
    "tweet.fields": "created_at,conversation_id,in_reply_to_user_id,referenced_tweets,entities,author_id",
    "user.fields": "name,username",
    expansions: "author_id",
    max_results: "100",
  });

  const response = await fetch(
    `https://api.x.com/2/users/${userId}/liked_tweets?${params.toString()}`,
    { headers: { Authorization: `Bearer ${bearerToken}` } }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error(`User likes fetch failed (${response.status}):`, errText);
    if (response.status === 402) throw new Error("X API credits depleted. Add credits in the X Developer Portal.");
    throw new Error(`Failed to fetch likes (${response.status})`);
  }

  const data = await response.json();
  const tweets: BookmarkTweet[] = data.data || [];
  const authors = new Map<string, BookmarkAuthor>();
  if (data.includes?.users) {
    for (const user of data.includes.users) {
      authors.set(user.id, user);
    }
  }
  return { tweets, authors };
}
