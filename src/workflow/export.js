import { toCSV, downloadFile, downloadJSON } from "../util.js";

/**
 * Export playlist collection to JSON file.
 * @param {any} data
 * @param {string} [filename]
 */
export function exportAsJSON(data, filename = "playlists.json") {
  downloadJSON(data, filename);
}

/**
 * Export playlists to CSV pair (playlists.csv + tracks.csv).
 * @param {{ playlists: any[] }} collection
 */
export function exportAsCSV(collection) {
  const playlistsRows = collection.playlists.map((playlist) => ({
    playlist_name: playlist.name,
    description: playlist.description ?? "",
    visibility: playlist.visibility ?? "private",
    source_name: collection.source ?? "unknown",
  }));
  const tracksRows = [];
  collection.playlists.forEach((playlist) => {
    playlist.tracks?.forEach((track, index) => {
      tracksRows.push({
        playlist_name: playlist.name,
        position: index + 1,
        title: track.title,
        artists: track.artists?.join("; ") ?? "",
        album: track.album ?? "",
        duration_ms: track.duration_ms ?? "",
        isrc: track.isrc ?? "",
        release_year: track.release_year ?? "",
        explicit: track.explicit ?? false,
        cover_url: track.coverUrl ?? "",
      });
    });
  });

  const playlistsCsv = toCSV(playlistsRows);
  const tracksCsv = toCSV(tracksRows);
  downloadFile([playlistsCsv], "playlists.csv", "text/csv");
  downloadFile([tracksCsv], "tracks.csv", "text/csv");
}
