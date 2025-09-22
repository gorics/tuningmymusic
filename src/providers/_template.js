/**
 * Provider template for extending ListBridge with new music services.
 * Copy this file, rename it (e.g. appleMusic.js) and implement all exported
 * functions. Register the provider in the UI by dynamically importing the module.
 */

/**
 * Describe provider capabilities and metadata.
 * @returns {import("./provider.types.js").ProviderCapabilities}
 */
export function getCapabilities() {
  return {
    supportsPlaylistCreate: false,
    supportsTrackAdd: false,
    supportsSearch: false,
    displayName: "Template Provider",
  };
}

/**
 * Fetch playlists for the authenticated user.
 * @returns {Promise<import("./provider.types.js").PlaylistSummary[]>}
 */
export async function listPlaylists() {
  throw new Error("Not implemented");
}

/**
 * Fetch tracks for a specific playlist.
 * @param {string} playlistId
 * @returns {Promise<import("./provider.types.js").TrackSummary[]>}
 */
export async function readTracks(playlistId) {
  throw new Error("Not implemented");
}

/**
 * Create a playlist in the target service.
 * @param {{ name: string, description?: string, visibility?: 'public' | 'private' }} options
 * @returns {Promise<{ id: string }>}
 */
export async function createPlaylist(options) {
  throw new Error("Not implemented");
}

/**
 * Add items to a playlist.
 * @param {string} playlistId
 * @param {string[]} ids
 */
export async function addItems(playlistId, ids) {
  throw new Error("Not implemented");
}

/**
 * Search tracks on the target service.
 * @param {string} query
 * @returns {Promise<import("./provider.types.js").TrackSummary[]>}
 */
export async function search(query) {
  throw new Error("Not implemented");
}
