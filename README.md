# ListBridge

This repository contains the ListBridge static web application for moving playlists between Spotify and YouTube with OAuth 2.1 PKCE flows. The core documentation lives in [`docs/README.md`](docs/README.md).

## Quick links

- [Setup & usage guide](docs/README.md)
- [GitHub Pages deployment walkthrough](docs/DEPLOY.md)
- [Spotify OAuth configuration](docs/OAUTH_SETUP_SPOTIFY.md)
- [Google OAuth configuration](docs/OAUTH_SETUP_GOOGLE.md)
- [Extending providers](docs/EXTENDING_PROVIDERS.md)

## Developer scripts

```bash
npm install     # install optional tooling
npm run lint    # syntax check JavaScript modules
npm test        # mapping heuristics unit tests
npm run build   # generate dist/ for static hosting
npm run dev     # serve locally via Python http.server
```

The generated `dist/` directory is safe to upload to GitHub Pages or any static host.
