const origin = typeof window !== "undefined" ? window.location.origin : "";
const basePath =
  typeof window !== "undefined"
    ? window.location.pathname.replace(/index\.html?$/, "")
    : "/";

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

const runtimeConfig = typeof globalThis !== "undefined" && globalThis.OAUTH_CONFIG
  ? globalThis.OAUTH_CONFIG
  : {};

export function getConfig() {
  const spotifyOverrides = runtimeConfig.spotify ?? {};
  const googleOverrides = runtimeConfig.google ?? {};
  const appOverrides = runtimeConfig.app ?? {};
  return {
    ...baseConfig,
    ...appOverrides,
    spotify: { ...baseConfig.spotify, ...spotifyOverrides },
    google: { ...baseConfig.google, ...googleOverrides },
  };
}
