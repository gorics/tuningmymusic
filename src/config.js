import { getState } from "./state.js";

const origin = window.location.origin;
const basePath = window.location.pathname.replace(/index\.html?$/, "");

const baseConfig = {
  appVersion: "1.0.0",
  spotify: {
    redirectUri: `${origin}${basePath}callback/spotify`,
    scopes: [
      "playlist-read-private",
      "user-library-read",
      "playlist-modify-private",
      "playlist-modify-public",
    ],
  },
  google: {
    redirectUri: `${origin}${basePath}callback/google`,
    scopes: [
      "https://www.googleapis.com/auth/youtube",
    ],
  },
};

export function getConfig() {
  const state = getState();
  const clientIds = state.settings?.oauthClientIds ?? { spotify: "", google: "" };
  return {
    ...baseConfig,
    spotify: { ...baseConfig.spotify, clientId: clientIds.spotify ?? "" },
    google: { ...baseConfig.google, clientId: clientIds.google ?? "" },
  };
}
