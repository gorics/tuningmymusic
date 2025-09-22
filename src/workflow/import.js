import { parseCSV, safeJsonParse } from "../util.js";

/**
 * Parse playlists JSON file.
 * @param {File} file
 * @returns {Promise<any>}
 */
export async function importFromJSON(file) {
  const text = await file.text();
  return safeJsonParse(text, {});
}

/**
 * Parse CSV playlist + tracks files into structured data.
 * @param {{ playlists: File, tracks: File }} files
 */
export async function importFromCSV(files) {
  const [playlistsText, tracksText] = await Promise.all([files.playlists.text(), files.tracks.text()]);
  const playlistRows = parseCSV(playlistsText);
  const trackRows = parseCSV(tracksText);

  const playlists = playlistRows.map((row) => ({
    id: row.playlist_name,
    name: row.playlist_name,
    description: row.description,
    visibility: row.visibility,
    source: row.source_name,
    tracks: [],
  }));
  const playlistMap = new Map(playlists.map((playlist) => [playlist.name, playlist]));

  trackRows.forEach((row) => {
    const target = playlistMap.get(row.playlist_name);
    if (!target) return;
    target.tracks.push({
      title: row.title,
      artists: row.artists ? row.artists.split(/;\s*/) : [],
      album: row.album,
      duration_ms: Number(row.duration_ms) || undefined,
      isrc: row.isrc || undefined,
      release_year: Number(row.release_year) || undefined,
      explicit: row.explicit === "true",
      coverUrl: row.cover_url,
    });
  });

  return {
    source: "csv",
    playlists,
    importedAt: Date.now(),
  };
}
