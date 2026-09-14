import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "../../..");
const tokenPath = path.join(projectRoot, "tokens/google.json");

const authorizationEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
const tokenEndpoint = "https://oauth2.googleapis.com/token";
const userInfoEndpoint = "https://www.googleapis.com/oauth2/v2/userinfo";

const scopes = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly"
];

const pendingStates = new Map();

function googleConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    redirectUri:
      process.env.GOOGLE_REDIRECT_URI ??
      "http://localhost:3001/api/google/oauth/callback",
    expectedEmail: process.env.GOOGLE_ACCOUNT_EMAIL ?? ""
  };
}

export function isGoogleConfigured() {
  const config = googleConfig();
  return Boolean(config.clientId && config.clientSecret && config.redirectUri);
}

export function getExpectedGoogleAccount() {
  return googleConfig().expectedEmail || null;
}

export function createAuthorizationUrl() {
  if (!isGoogleConfigured()) {
    throw new Error("Google OAuth är inte konfigurerat i .env.");
  }

  const config = googleConfig();
  const state = randomBytes(24).toString("hex");
  pendingStates.set(state, Date.now());

  for (const [storedState, createdAt] of pendingStates) {
    if (Date.now() - createdAt > 10 * 60 * 1000) {
      pendingStates.delete(storedState);
    }
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent select_account",
    state
  });

  if (config.expectedEmail) {
    params.set("login_hint", config.expectedEmail);
  }

  return `${authorizationEndpoint}?${params.toString()}`;
}

export function consumeOAuthState(state) {
  const createdAt = pendingStates.get(state);
  pendingStates.delete(state);
  return Boolean(createdAt && Date.now() - createdAt <= 10 * 60 * 1000);
}

async function saveToken(token) {
  await mkdir(path.dirname(tokenPath), { recursive: true });
  await writeFile(tokenPath, `${JSON.stringify(token, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600
  });
}

export async function clearGoogleToken() {
  await rm(tokenPath, { force: true });
}

export async function loadToken() {
  try {
    return JSON.parse(await readFile(tokenPath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function exchangeAuthorizationCode(code) {
  if (!isGoogleConfigured()) {
    throw new Error("Google OAuth är inte konfigurerat i .env.");
  }

  const config = googleConfig();
  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code"
    })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error_description ?? payload.error ?? "Google OAuth misslyckades.");
  }

  const token = {
    ...payload,
    expires_at: Date.now() + Number(payload.expires_in ?? 3600) * 1000
  };

  await saveToken(token);
  return token;
}

async function refreshAccessToken(token) {
  if (!token?.refresh_token) {
    throw new Error("Google-token saknar refresh token. Anslut Google Calendar på nytt.");
  }

  const config = googleConfig();
  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: token.refresh_token,
      grant_type: "refresh_token"
    })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error_description ?? payload.error ?? "Kunde inte förnya Google-token.");
  }

  const refreshed = {
    ...token,
    ...payload,
    refresh_token: token.refresh_token,
    expires_at: Date.now() + Number(payload.expires_in ?? 3600) * 1000
  };

  await saveToken(refreshed);
  return refreshed;
}

export async function getAccessToken() {
  let token = await loadToken();
  if (!token) {
    throw new Error("Google Calendar är inte ansluten.");
  }

  if (!token.access_token || !token.expires_at || Date.now() >= token.expires_at - 60_000) {
    token = await refreshAccessToken(token);
  }

  return token.access_token;
}

export async function googleFetch(url, options = {}) {
  const accessToken = await getAccessToken();
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (response.status === 401) {
    const token = await loadToken();
    if (token?.refresh_token) {
      await refreshAccessToken({ ...token, expires_at: 0 });
      const retryToken = await getAccessToken();
      return fetch(url, {
        ...options,
        headers: {
          ...(options.headers ?? {}),
          Authorization: `Bearer ${retryToken}`
        }
      });
    }
  }

  return response;
}

export async function getGoogleAccount() {
  const response = await googleFetch(userInfoEndpoint);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Kunde inte läsa Google-kontot.");
  }

  return {
    email: payload.email ?? null,
    verifiedEmail: Boolean(payload.verified_email)
  };
}
