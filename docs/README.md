# ListBridge

ListBridge is a security-focused, fully static single-page web application that moves playlists between Spotify and YouTube. It runs entirely in the browser (GitHub Pages friendly) using OAuth 2.1 PKCE and official APIs only. No secrets or tokens ever leave the user's device.

## Features

- ✅ Spotify & Google authentication via OAuth 2.1 PKCE (no client secrets).
- ✅ Playlist import from Spotify, JSON, or CSV.
- ✅ Auto mapping of tracks using normalization + similarity scoring.
- ✅ Manual review UI for ambiguous matches.
- ✅ Batched playlist creation on YouTube with quota awareness.
- ✅ Export to CSV/JSON and failure logs for auditing.
- ✅ Resume support using encrypted storage (optional).
- ✅ Responsive, accessible UI with dark mode, keyboard navigation, and i18n (ko/en).
- ✅ 100% static deployable bundle (HTML/CSS/JS) – no build step required.
- ✅ OAuth client IDs loaded from `oauth.config.js` so sign-in buttons immediately launch the official pop-ups.

## Quick start

1. Clone this repository and serve it locally:
   ```bash
   npm install # optional, for scripts
   npm run dev
   # or: python3 -m http.server 4173
   ```
2. Follow the OAuth setup guides in `docs/OAUTH_SETUP_SPOTIFY.md` and `docs/OAUTH_SETUP_GOOGLE.md` to create client IDs and register redirect URIs.
3. Edit `oauth.config.js` in the project root and replace the placeholder Spotify/Google client IDs with your own (no secrets required).
4. Open the app (default `http://localhost:4173`), navigate to **Connect**, confirm both providers show “Configured”, and use the **Connect** cards to authorize. The login pop-ups use the IDs defined in `oauth.config.js`.
5. Import playlists (Spotify/JSON/CSV) on **Select** and preview tracks.
6. Run **Match** to auto-map tracks, then manually review any remaining items.
7. Start **Transfer** to create playlists on YouTube, monitor quota and progress, and download the final report.

## Folder structure

```
index.html              # SPA entry point
assets/                 # Icons and stylesheets
src/                    # ES modules for app logic
  auth/                 # OAuth flows (PKCE)
  providers/            # Provider implementations (Spotify, YouTube)
  mapping/              # Normalization + scoring engine
  workflow/             # Import/export/transfer pipelines
  ui/                   # Components, router, i18n
  config.js             # Runtime configuration storage
  state.js              # Global state & persistence helpers
  util.js               # Shared utilities
  app.js                # Bootstrap + route handlers
docs/                   # Guides & deployment docs
test/                   # Browser/Node friendly test assets
data/                   # Sample CSV/JSON files for demo
```

## Static deployment

- Copy the repository contents to any static host (GitHub Pages recommended).
- Ensure the redirect URIs configured in Spotify and Google match the final Pages URL plus `#callback/spotify` and `#callback/google`.
- See `docs/DEPLOY.md` for a step-by-step GitHub Pages guide.

## Security & privacy

- PKCE + implicit flow ensures no secrets in the bundle.
- Access/refresh tokens are stored in `sessionStorage` by default; optional encrypted `localStorage` persistence is available.
- No network requests other than Spotify/YouTube APIs.
- Content Security Policy is embedded in `index.html` to restrict origins.
- Logs and reports stay local (downloadable CSV/JSON only).

## Accessibility & UX

- Semantic HTML, ARIA roles, and live regions for screen readers.
  - `util.js#announce()` broadcasts status updates.
- Keyboard-friendly navigation and focus states.
- Responsive layout supporting mobile/tablet/desktop.
- Dark/light/system theme toggle with persisted preference.
- Multi-language support via `src/ui/i18n.js`.

## Testing & quality

- Unit tests: `npm test` runs `test/mapping.test.js` (Node, ES modules).
- Manual E2E: `test/e2e.md` enumerates end-to-end scenarios.
- Lighthouse guidance: aim for 90+ Performance/Accessibility/Best Practices/SEO.

## Extending

- Provider template (`src/providers/_template.js`) documents the minimal interface to integrate new services (e.g., Apple Music via server-signed tokens).
- Mapping rules (`src/mapping/rules.js`) include stopwords, version tags, and scoring thresholds that can be extended per locale.
- Client IDs live in `oauth.config.js`, while tokens/preferences stay in the browser (session or encrypted local storage).

## Known limitations

- YouTube quotas apply (playlist & playlistItems insert cost 50 units each); heavy transfers may require multiple days.
- YouTube Music mirrors YouTube playlists with slight propagation delay; expect up to several minutes before new playlists appear.
- Apple Music requires a server-signed developer token; the template hook is provided, but default build keeps it disabled.
- Browser execution means large playlists (5k tracks) rely on virtualization; ensure modern browsers for optimal performance.
- PWA manifest included but offline functionality limited to shell (API calls require connectivity).

## License

MIT License. Contributions and forks welcome.
