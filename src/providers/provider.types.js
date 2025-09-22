/**
 * @typedef {Object} PlaylistSummary
 * @property {string} id
 * @property {string} name
 * @property {string} [description]
 * @property {string} [coverUrl]
 * @property {number} [trackCount]
 */

/**
 * @typedef {Object} TrackSummary
 * @property {string} id
 * @property {string} title
 * @property {string[]} artists
 * @property {string} [album]
 * @property {number} [duration_ms]
 * @property {string} [isrc]
 * @property {number} [release_year]
 * @property {boolean} [explicit]
 * @property {string} [coverUrl]
 * @property {Record<string, string>} [sourceIds]
 */

/**
 * @typedef {Object} ProviderCapabilities
 * @property {boolean} supportsPlaylistCreate
 * @property {boolean} supportsTrackAdd
 * @property {boolean} supportsSearch
 * @property {string} displayName
 */

/**
 * @typedef {Object} ProviderClient
 * @property {() => Promise<PlaylistSummary[]>} listPlaylists
 * @property {(playlistId: string) => Promise<TrackSummary[]>} readTracks
 * @property {(options: { name: string, description?: string, visibility?: 'public' | 'private' }) => Promise<{ id: string }>} createPlaylist
 * @property {(playlistId: string, trackUris: string[]) => Promise<void>} addItems
 * @property {(query: string) => Promise<TrackSummary[]>} search
 * @property {() => ProviderCapabilities} getCapabilities
 */

export {};
