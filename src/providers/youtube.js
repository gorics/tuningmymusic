import { fetchWithRetry, withBackoff } from "../util.js";
import { getState, setToken } from "../state.js";
import { getGoogleToken } from "../auth/googleAuth.js";

const API_BASE = "https://www.googleapis.com/youtube/v3";

const QUOTA_COST = {
  playlistList: 1,
  playlistInsert: 50,
  playlistItemsList: 1,
  playlistItemsInsert: 50,
  searchList: 100,
  videosList: 1,
};

let quotaUsed = 0;

function trackQuota(cost) {
  quotaUsed += cost;
}

export function getQuotaUsage() {
  const daily = 10_000;
  return {
    used: quotaUsed,
    remaining: Math.max(0, daily - quotaUsed),
    daily,
  };
}

async function apiRequest(path, options = {}) {
  const stateToken = getState().tokens.google;
  const token = (await getGoogleToken()) ?? stateToken;
  if (!token) throw new Error("Google authentication required");
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
    setToken("google", null);
    throw new Error("Google token expired");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(`YouTube API error ${response.status}: ${body.error?.message ?? "Unknown"}`);
  }
  trackQuota(deriveQuotaCost(path, options.method ?? "GET"));
  if (response.status === 204) return null;
  return response.json();
}

function deriveQuotaCost(path, method) {
  if (path.includes("playlists?")) return QUOTA_COST.playlistList;
  if (path.includes("playlists") && method === "POST") return QUOTA_COST.playlistInsert;
  if (path.includes("playlistItems?")) return QUOTA_COST.playlistItemsList;
  if (path.includes("playlistItems") && method === "POST") return QUOTA_COST.playlistItemsInsert;
  if (path.includes("search")) return QUOTA_COST.searchList;
  if (path.includes("videos")) return QUOTA_COST.videosList;
  return 1;
}

export async function listPlaylists() {
  /** @type {import("./provider.types.js").PlaylistSummary[]} */
  const playlists = [];
  let nextPageToken = "";
  do {
    const params = new URLSearchParams({
      part: "snippet,contentDetails",
      mine: "true",
      maxResults: "50",
    });
    if (nextPageToken) params.set("pageToken", nextPageToken);
    const response = await apiRequest(`/playlists?${params.toString()}`);
    response.items?.forEach((item) => {
      playlists.push({
        id: item.id,
        name: item.snippet.title,
        description: item.snippet.description,
        coverUrl: item.snippet.thumbnails?.standard?.url ?? item.snippet.thumbnails?.high?.url,
        trackCount: item.contentDetails?.itemCount ?? 0,
      });
    });
    nextPageToken = response.nextPageToken;
  } while (nextPageToken);
  return playlists;
}

export async function readTracks(playlistId) {
  /** @type {import("./provider.types.js").TrackSummary[]} */
  const tracks = [];
  let nextPageToken = "";
  do {
    const params = new URLSearchParams({
      part: "snippet,contentDetails",
      playlistId,
      maxResults: "50",
    });
    if (nextPageToken) params.set("pageToken", nextPageToken);
    const response = await apiRequest(`/playlistItems?${params.toString()}`);
    for (const item of response.items ?? []) {
      const snippet = item.snippet;
      if (!snippet?.resourceId) continue;
      tracks.push({
        id: snippet.resourceId.videoId,
        title: snippet.title,
        artists: snippet.videoOwnerChannelTitle ? [snippet.videoOwnerChannelTitle] : [],
        album: snippet.channelTitle,
        duration_ms: undefined,
        explicit: false,
        coverUrl: snippet.thumbnails?.medium?.url ?? snippet.thumbnails?.high?.url,
        sourceIds: { youtube: snippet.resourceId.videoId },
      });
    }
    nextPageToken = response.nextPageToken;
  } while (nextPageToken);
  return tracks;
}

export async function createPlaylist(options) {
  const body = {
    snippet: {
      title: options.name,
      description: options.description,
    },
    status: {
      privacyStatus: options.visibility === "public" ? "public" : "private",
    },
  };
  const params = new URLSearchParams({ part: "snippet,status" });
  const response = await apiRequest(`/playlists?${params.toString()}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return { id: response.id };
}

export async function addItems(playlistId, videoIds) {
  for (const videoId of videoIds) {
    await withBackoff(() =>
      apiRequest(`/playlistItems?part=snippet`, {
        method: "POST",
        body: JSON.stringify({
          snippet: {
            playlistId,
            resourceId: {
              kind: "youtube#video",
              videoId,
            },
          },
        }),
      })
    );
  }
}

export async function search(query) {
  const params = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    maxResults: "10",
  });
  const response = await apiRequest(`/search?${params.toString()}`);
  const ids = response.items?.map((item) => item.id?.videoId).filter(Boolean) ?? [];
  if (!ids.length) return [];
  const details = await apiRequest(`/videos?part=snippet,contentDetails&id=${ids.join(",")}`);
  return details.items.map((item) => ({
    id: item.id,
    title: item.snippet.title,
    artists: item.snippet.videoOwnerChannelTitle ? [item.snippet.videoOwnerChannelTitle] : [],
    album: item.snippet.channelTitle,
    duration_ms: parseISODuration(item.contentDetails?.duration ?? "PT0S"),
    explicit: item.contentDetails?.contentRating?.ytRating === "ytAgeRestricted",
    coverUrl: item.snippet.thumbnails?.high?.url,
    sourceIds: { youtube: item.id },
  }));
}

export function getCapabilities() {
  return {
    supportsPlaylistCreate: true,
    supportsTrackAdd: true,
    supportsSearch: true,
    displayName: "YouTube",
  };
}

function parseISODuration(duration) {
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(duration);
  if (!match) return 0;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}
