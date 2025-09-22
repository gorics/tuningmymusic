import { prepareAuthorization, handleRedirect, persistToken, ensureFreshToken } from "./oauth.js";
import { getConfig } from "../config.js";
import { updateState, getState, setToken } from "../state.js";
import { announce } from "../util.js";

const STATE_KEY = "listbridge.google.oauth.state";

/**
 * Start Google OAuth flow for YouTube Data API.
 */
export async function authorizeGoogle() {
  const config = getConfig().google;
  if (!config.clientId) throw new Error("Google OAuth Client ID is not set. Configure it in Settings.");
  const { url, state } = await prepareAuthorization({
    authorizeEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    scopes: config.scopes,
    extraParams: {
      access_type: "offline",
      include_granted_scopes: "true",
      prompt: "consent",
    },
  });
  sessionStorage.setItem(STATE_KEY, state);
  window.location.assign(url);
}

/**
 * Handle Google OAuth redirect.
 * @param {string} currentUrl
 */
export async function handleGoogleRedirect(currentUrl) {
  const config = getConfig().google;
  const expectedState = sessionStorage.getItem(STATE_KEY) ?? "";
  const token = await handleRedirect({
    currentUrl,
    expectedState,
    tokenEndpoint: "https://oauth2.googleapis.com/token",
    clientId: config.clientId,
    redirectUri: config.redirectUri,
  });
  if (!token) return null;
  persistToken("google", token);
  updateState({ user: { ...getState().user, google: { authenticatedAt: Date.now() } } });
  announce("Google 계정이 연결되었습니다.");
  return token;
}

/**
 * Obtain latest Google access token.
 * @returns {Promise<import("./oauth.js").TokenResponse | null>}
 */
export async function getGoogleToken() {
  const config = getConfig().google;
  return ensureFreshToken("google", {
    tokenEndpoint: "https://oauth2.googleapis.com/token",
    clientId: config.clientId,
  });
}

export function disconnectGoogle() {
  setToken("google", null);
  updateState({ user: { ...getState().user, google: null } });
}
