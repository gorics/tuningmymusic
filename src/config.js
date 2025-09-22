import { safeJsonParse } from "./util.js";

const origin = window.location.origin;
const basePath = window.location.pathname.replace(/index\.html?$/, "");

const defaultConfig = {
  appVersion: "1.0.0",
  spotify: {
    clientId: "",
    redirectUri: `${origin}${basePath}callback/spotify`,
    scopes: [
      "playlist-read-private",
      "user-library-read",
      "playlist-modify-private",
      "playlist-modify-public",
    ],
  },
  google: {
    clientId: "",
    redirectUri: `${origin}${basePath}callback/google`,
    scopes: [
      "https://www.googleapis.com/auth/youtube",
    ],
  },
};

const STORAGE_KEY = "listbridge.config.v1";

let runtimeConfig = {
  ...defaultConfig,
  ...safeJsonParse(localStorage.getItem(STORAGE_KEY), {}),
};

export function getConfig() {
  return runtimeConfig;
}

export function updateConfig(partial) {
  runtimeConfig = {
    ...runtimeConfig,
    ...partial,
    spotify: { ...runtimeConfig.spotify, ...partial?.spotify },
    google: { ...runtimeConfig.google, ...partial?.google },
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(runtimeConfig));
  return runtimeConfig;
}

export function resetConfig() {
  runtimeConfig = { ...defaultConfig };
  localStorage.removeItem(STORAGE_KEY);
  return runtimeConfig;
}
