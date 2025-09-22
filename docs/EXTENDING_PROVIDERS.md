# Extending ListBridge Providers

ListBridge ships with Spotify (source) and YouTube (target) providers. Additional services can be integrated by following the contract defined in `src/providers/_template.js`.

## Provider interface

Each provider module must export the following functions:

```js
export function getCapabilities();
export async function listPlaylists();
export async function readTracks(playlistId);
export async function createPlaylist(options);
export async function addItems(playlistId, ids);
export async function search(query);
```

See `src/providers/provider.types.js` for the shape of playlists and tracks.

## Implementation guidance

1. **Authentication**
   - Use OAuth 2.1 PKCE whenever possible (see `src/auth/oauth.js`).
   - For services requiring server-generated tokens (e.g., Apple Music developer tokens), create a small gateway endpoint that issues short-lived tokens. Document the requirement clearly (UI toggles should remain disabled by default).

2. **API wrappers**
   - Follow the structure in `spotify.js` and `youtube.js`:
     - `fetchWithRetry` handles 429/5xx retry logic with exponential backoff and jitter.
     - Respect pagination (limit/pageToken) and rate limits.
     - Return normalized track objects (`title`, `artists`, `duration_ms`, `sourceIds`).

3. **Mapping heuristics**
   - Update `src/mapping/rules.js` for stopwords, version tags, and score thresholds relevant to the new provider or locale.
   - If the provider exposes unique metadata (e.g., ISRC, UPC), enrich `sourceIds` to improve mapping accuracy.

4. **UI integration**
   - Add new providers to the **Connect** page by importing the module dynamically and rendering a `ProviderConnectCard` instance.
   - Update `src/workflow/transfer.js` to understand the new target provider (`providerName` should match the key used in `sourceIds`).
   - Extend i18n entries in `src/ui/i18n.js` for provider-specific text.

5. **Testing**
   - Add mock implementations in `test/providers.mock.js`.
   - Extend `test/mapping.test.js` with normalization/scoring cases for new locales.
   - Update `docs/README.md` and OAuth guides with provider-specific instructions.

## Apple Music note

Apple Music's MusicKit JS requires a developer token signed on a server. For compliance:

- Provide a toggle in the UI that explains the requirement (`Server-signed developer token required`).
- Implement a provider module that expects a token from the gateway, but keep it disabled until token infrastructure is ready.
- Never ship the private key or token in the static bundle.

