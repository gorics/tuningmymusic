import { prepareAuthorization, handleRedirect, persistToken, ensureFreshToken } from "./oauth.js";
import { getConfig } from "../config.js";
import { updateState, getState, setToken } from "../state.js";
import { announce } from "../util.js";

const STATE_KEY = "listbridge.spotify.oauth.state";

/**
 * Launch Spotify authorization flow.
 */
export async function authorizeSpotify() {
  const config = getConfig().spotify;
  if (!config.clientId) throw new Error("Spotify Client ID is not set. Configure it in Settings.");
  const { url, state } = await prepareAuthorization({
    authorizeEndpoint: "https://accounts.spotify.com/authorize",
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    scopes: config.scopes,
  });
  sessionStorage.setItem(STATE_KEY, state);
  window.location.assign(url);
}

/**
 * Handle Spotify redirect on callback page.
 * @param {string} currentUrl
 */
export async function handleSpotifyRedirect(currentUrl) {
  const config = getConfig().spotify;
  const expectedState = sessionStorage.getItem(STATE_KEY) ?? "";
  const token = await handleRedirect({
    currentUrl,
    expectedState,
    tokenEndpoint: "https://accounts.spotify.com/api/token",
    clientId: config.clientId,
    redirectUri: config.redirectUri,
  });
  if (!token) return null;
  persistToken("spotify", token);
  updateState({ user: { ...getState().user, spotify: { authenticatedAt: Date.now() } } });
  announce("Spotify 연결이 완료되었습니다.");
  return token;
}

/**
 * Refresh token if needed and return latest access token.
 * @returns {Promise<import("./oauth.js").TokenResponse | null>}
 */
export async function getSpotifyToken() {
  const config = getConfig().spotify;
  return ensureFreshToken("spotify", {
    tokenEndpoint: "https://accounts.spotify.com/api/token",
    clientId: config.clientId,
  });
}

export function disconnectSpotify() {
  setToken("spotify", null);
  updateState({ user: { ...getState().user, spotify: null } });
}
