/**
 * Runtime OAuth configuration for ListBridge.
 *
 * Replace the placeholder client IDs with the values from your Spotify and Google OAuth apps.
 * The file is loaded before the SPA bootstraps so the login buttons can launch immediately
 * without entering IDs through the UI. Do not include client secrets.
 */
window.OAUTH_CONFIG = Object.freeze({
  spotify: {
    /**
     * Spotify application Client ID.
     * @see https://developer.spotify.com/dashboard
     */
    clientId: "",
  },
  google: {
    /**
     * Google OAuth Client ID for YouTube Data API v3.
     * @see https://console.cloud.google.com/apis/credentials
     */
    clientId: "",
  },
});
