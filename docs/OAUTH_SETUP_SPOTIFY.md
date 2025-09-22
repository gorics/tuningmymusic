# Spotify OAuth Setup (PKCE)

ListBridge uses Spotify's PKCE-based Authorization Code flow. Follow these steps to configure an app.

1. **Create an application**
   - Visit <https://developer.spotify.com/dashboard> and sign in.
   - Click **Create app** → name it (e.g., `ListBridge`), supply a description, and select the required scopes.
   - Agree to terms and create the app.

2. **Add redirect URI**
    - In the app settings, click **Edit settings**.
    - Under *Redirect URIs*, add the Pages/local URL followed by `callback/spotify`. Examples:
        - Local dev: `http://localhost:4173/callback/spotify`
        - GitHub Pages: `https://<username>.github.io/<repo>/callback/spotify`
    - The repository ships a static `callback/spotify/index.html` helper that immediately forwards the auth response back to `index.html#callback/spotify`, so the redirect works on 100% static hosts.
    - Save.

3. **Client information**
   - Copy the **Client ID**. No client secret is required.
   - Edit `oauth.config.js` and replace the Spotify `clientId` placeholder with the copied value. Save the file (and commit if deploying to GitHub Pages).

4. **Scopes required**
   - `playlist-read-private`
   - `user-library-read` (optional, for liked tracks import)
   - `playlist-modify-private`
   - `playlist-modify-public`

5. **Testing checklist**
    - [ ] Redirect URI saved.
    - [ ] Spotify Client ID defined in `oauth.config.js` and showing as “Configured” on **Connect**.
    - [ ] Authorization dialog displays ListBridge app name.
    - [ ] After consent, the app returns to `#/connect` and shows “Connected”.
    - [ ] `sessionStorage` contains `listbridge.tokens.v1` with Spotify token (inspect via DevTools).

6. **Troubleshooting**
   - `INVALID_CLIENT`: ensure the Client ID is correct and not the Client Secret.
   - `INVALID_REDIRECT_URI`: confirm the URI matches exactly (scheme/host/path).
   - `INSUFFICIENT_CLIENT_SCOPE`: Spotify caches scopes per session; log out from accounts.spotify.com and retry.

