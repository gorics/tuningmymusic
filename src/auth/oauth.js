import { fetchWithRetry, uid } from "../util.js";
import { getToken, setToken } from "../state.js";

/**
 * @typedef {Object} PKCEChallenge
 * @property {string} verifier
 * @property {string} challenge
 */

/**
 * @typedef {Object} TokenResponse
 * @property {string} access_token
 * @property {string} token_type
 * @property {number} expires_in
 * @property {string} [refresh_token]
 * @property {string} [scope]
 * @property {number} [expires_at]
 */

const PKCE_STORE_KEY = "listbridge.pkce";

/**
 * Generate PKCE verifier and challenge.
 * @returns {Promise<PKCEChallenge>}
 */
export async function createPKCEChallenge() {
  const verifier = base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  const challenge = base64UrlEncode(new Uint8Array(digest));
  return { verifier, challenge };
}

/**
 * Build authorization URL.
 * @param {{ authorizeEndpoint: string, clientId: string, redirectUri: string, scopes: string[], state?: string, extraParams?: Record<string, string> }} params
 * @returns {{ url: string, state: string, verifier: string }}
 */
export async function prepareAuthorization(params) {
  const { authorizeEndpoint, clientId, redirectUri, scopes, state = uid(), extraParams = {} } = params;
  const pkce = await createPKCEChallenge();
  const url = new URL(authorizeEndpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", pkce.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  Object.entries(extraParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  storeVerifier(state, pkce.verifier);
  return { url: url.toString(), state, verifier: pkce.verifier };
}

/**
 * Handle redirect and exchange authorization code for tokens.
 * @param {{ currentUrl: string, expectedState: string, tokenEndpoint: string, clientId: string, redirectUri: string }} params
 * @returns {Promise<TokenResponse | null>}
 */
export async function handleRedirect(params) {
  const { currentUrl, expectedState, tokenEndpoint, clientId, redirectUri } = params;
  const parsed = new URL(currentUrl);
  const code = parsed.searchParams.get("code");
  const stateParam = parsed.searchParams.get("state");
  const error = parsed.searchParams.get("error");
  if (error) throw new Error(`Authorization error: ${error}`);
  if (!code || !stateParam || stateParam !== expectedState) return null;
  const verifier = consumeVerifier(stateParam);
  if (!verifier) throw new Error("Missing PKCE verifier");
  const token = await exchangeToken(tokenEndpoint, {
    clientId,
    code,
    codeVerifier: verifier,
    redirectUri,
  });
  return token;
}

/**
 * Exchange authorization code for tokens.
 * @param {string} tokenEndpoint
 * @param {{ clientId: string, code: string, codeVerifier: string, redirectUri: string }} body
 * @returns {Promise<TokenResponse>}
 */
export async function exchangeToken(tokenEndpoint, body) {
  const payload = new URLSearchParams();
  payload.set("grant_type", "authorization_code");
  payload.set("client_id", body.clientId);
  payload.set("code", body.code);
  payload.set("code_verifier", body.codeVerifier);
  payload.set("redirect_uri", body.redirectUri);

  const response = await fetchWithRetry(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: payload.toString(),
  });
  const token = /** @type {TokenResponse} */ (await response.json());
  token.expires_at = Date.now() + (token.expires_in - 30) * 1000;
  return token;
}

/**
 * Refresh an access token.
 * @param {string} tokenEndpoint
 * @param {{ clientId: string, refreshToken: string }} body
 * @returns {Promise<TokenResponse>}
 */
export async function refreshToken(tokenEndpoint, body) {
  const payload = new URLSearchParams();
  payload.set("grant_type", "refresh_token");
  payload.set("client_id", body.clientId);
  payload.set("refresh_token", body.refreshToken);

  const response = await fetchWithRetry(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: payload.toString(),
  });
  const token = /** @type {TokenResponse} */ (await response.json());
  token.refresh_token = token.refresh_token ?? body.refreshToken;
  token.expires_at = Date.now() + (token.expires_in - 30) * 1000;
  return token;
}

/**
 * Determine if the token is expired.
 * @param {TokenResponse | null} token
 */
export function isExpired(token) {
  if (!token || !token.expires_at) return true;
  return Date.now() > token.expires_at;
}

/**
 * Ensure token is fresh, refreshing when necessary.
 * @param {'spotify' | 'google'} provider
 * @param {{ tokenEndpoint: string, clientId: string }} config
 * @returns {Promise<TokenResponse | null>}
 */
export async function ensureFreshToken(provider, config) {
  const token = getToken(provider);
  if (!token) return null;
  if (!isExpired(token)) return token;
  if (!token.refresh_token) return null;
  const refreshed = await refreshToken(config.tokenEndpoint, {
    clientId: config.clientId,
    refreshToken: token.refresh_token,
  });
  setToken(provider, refreshed);
  return refreshed;
}

/**
 * Persist token in state storage.
 * @param {'spotify' | 'google'} provider
 * @param {TokenResponse} token
 */
export function persistToken(provider, token) {
  setToken(provider, token);
}

function storeVerifier(state, verifier) {
  const existing = JSON.parse(sessionStorage.getItem(PKCE_STORE_KEY) ?? "{}");
  existing[state] = verifier;
  sessionStorage.setItem(PKCE_STORE_KEY, JSON.stringify(existing));
}

function consumeVerifier(state) {
  const existing = JSON.parse(sessionStorage.getItem(PKCE_STORE_KEY) ?? "{}");
  const verifier = existing[state];
  delete existing[state];
  sessionStorage.setItem(PKCE_STORE_KEY, JSON.stringify(existing));
  return verifier;
}

function base64UrlEncode(bytes) {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
