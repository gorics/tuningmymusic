# Google / YouTube OAuth Setup (PKCE)

The YouTube Data API v3 supports OAuth 2.0 PKCE. Configure a client for ListBridge as follows.

1. **Create an OAuth consent screen**
   - Visit <https://console.cloud.google.com/>.
   - Create or select a project.
   - Go to *APIs & Services* → *OAuth consent screen*.
   - Choose *External*, fill in app name/support email, and add your test users (Google requires verification for production use).
   - Save and submit for verification if needed.

2. **Enable APIs**
   - In *APIs & Services* → *Library*, enable **YouTube Data API v3**.

3. **Create credentials**
   - Go to *Credentials* → **Create credentials** → *OAuth client ID*.
   - Select *Web application*.
   - Add authorized redirect URIs:
     - Local dev: `http://localhost:4173/callback/google`
     - GitHub Pages: `https://<username>.github.io/<repo>/callback/google`
   - Click **Create** and copy the *Client ID* (no secret required for PKCE).
   - Edit `oauth.config.js` and replace the Google `clientId` placeholder with the copied value. Save/commit before deploying so the static site serves the updated config.

4. **Configure scopes**
   - ListBridge requests `https://www.googleapis.com/auth/youtube` (full playlist access).
   - If you prefer granular permissions, ensure you include at least:
     - `https://www.googleapis.com/auth/youtube.readonly`
     - `https://www.googleapis.com/auth/youtube.force-ssl`
     - `https://www.googleapis.com/auth/youtube.upload`

5. **Quota planning**
   - Each `playlists.insert` costs 50 units.
   - Each `playlistItems.insert` costs 50 units per track addition.
   - Daily quota is 10,000 units by default (approx. 100 playlist item inserts).
   - The UI shows estimated remaining units via `QuotaHint`.

6. **Testing checklist**
   - [ ] OAuth consent screen published (or test users added).
- [ ] Google Client ID defined in `oauth.config.js` and showing as “Configured” on **Connect**.
   - [ ] Authorization prompt shows requested scopes.
   - [ ] After approval, app navigates back to `#/connect` and shows Google connected.
   - [ ] Network tab confirms tokens exchanged via `https://oauth2.googleapis.com/token`.

7. **Troubleshooting**
   - `redirect_uri_mismatch`: verify the URI exactly matches the one in the Google console.
   - `access_denied`: user canceled consent or scopes require verification.
   - Quota exhaustion: wait until 00:00 Pacific Time when quotas reset. Use the report export to resume later.

