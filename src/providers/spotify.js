import { fetchWithRetry, withBackoff } from "../util.js";
import { getState, setToken } from "../state.js";
import { getSpotifyToken } from "../auth/spotifyAuth.js";

const API_BASE = "https://api.spotify.com/v1";

let cachedUser;

async function apiRequest(path, options = {}) {
  const stateToken = getState().tokens.spotify;
  const token = (await getSpotifyToken()) ?? stateToken;
  if (!token) throw new Error("Spotify authentication required");
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const response = await fetchWithRetry(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (response.status === 401) {
    setToken("spotify", null);
    throw new Error("Spotify token expired");
  }
  if (response.status === 204) return null;
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(`Spotify API error ${response.status}: ${body.error?.message ?? "Unknown"}`);
  }
  return response.json();
}

async function ensureUserProfile() {
  if (cachedUser) return cachedUser;
  cachedUser = await apiRequest("/me");
  return cachedUser;
}

export async function listPlaylists() {
  /** @type {import("./provider.types.js").PlaylistSummary[]} */
  const playlists = [];
  let next = "/me/playlists?limit=50";
  while (next) {
    const response = await apiRequest(next);
    response.items.forEach((item) => {
      playlists.push({
        id: item.id,
        name: item.name,
        description: item.description,
        coverUrl: item.images?.[0]?.url,
        trackCount: item.tracks?.total ?? 0,
      });
    });
    next = response.next;
  }
  return playlists;
}

export async function readTracks(playlistId) {
  /** @type {import("./provider.types.js").TrackSummary[]} */
  const tracks = [];
  let next = `${API_BASE}/playlists/${playlistId}/tracks?limit=100`;
  while (next) {
    const response = await apiRequest(next);
    response.items.forEach((item) => {
      if (!item.track) return;
      const track = item.track;
      tracks.push({
        id: track.id,
        title: track.name,
        artists: track.artists?.map((artist) => artist.name) ?? [],
        album: track.album?.name,
        duration_ms: track.duration_ms,
        isrc: track.external_ids?.isrc,
        release_year: track.album?.release_date ? Number(track.album.release_date.slice(0, 4)) : undefined,
        explicit: track.explicit,
        coverUrl: track.album?.images?.[0]?.url,
        sourceIds: { spotify: track.uri },
      });
    });
    next = response.next;
  }
  return tracks;
}

export async function createPlaylist(options) {
  const user = await ensureUserProfile();
  const payload = {
    name: options.name,
    description: options.description,
    public: options.visibility === "public",
  };
  const response = await apiRequest(`/users/${user.id}/playlists`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return { id: response.id };
}

export async function addItems(playlistId, trackUris) {
  const chunks = chunk(trackUris, 100);
  for (const uris of chunks) {
    await withBackoff(() =>
      apiRequest(`/playlists/${playlistId}/tracks`, {
        method: "POST",
        body: JSON.stringify({ uris }),
      })
    );
  }
}

export async function search(query) {
  const params = new URLSearchParams({ q: query, type: "track", limit: "10" });
  const response = await apiRequest(`/search?${params.toString()}`);
  const tracks = response.tracks?.items ?? [];
  return tracks.map((track) => ({
    id: track.id,
    title: track.name,
    artists: track.artists?.map((artist) => artist.name) ?? [],
    album: track.album?.name,
    duration_ms: track.duration_ms,
    release_year: track.album?.release_date ? Number(track.album.release_date.slice(0, 4)) : undefined,
    explicit: track.explicit,
    coverUrl: track.album?.images?.[0]?.url,
    sourceIds: { spotify: track.uri },
  }));
}

export function getCapabilities() {
  return {
    supportsPlaylistCreate: true,
    supportsTrackAdd: true,
    supportsSearch: true,
    displayName: "Spotify",
  };
}

function chunk(arr, size) {
  /** @type {string[][]} */
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}
