export const spotifyMock = {
  listPlaylists: async () => [
    { id: "mock-1", name: "Mock Playlist", description: "Example", trackCount: 2 },
  ],
  readTracks: async () => [
    {
      id: "mock-track-1",
      title: "City Lights",
      artists: ["Dreamstatic", "Feather"],
      album: "Skyline",
      duration_ms: 198000,
      release_year: 2020,
      explicit: false,
      sourceIds: { spotify: "mock:1" },
    },
  ],
  search: async (query) => [{
    id: "mock-track-1",
    title: query,
    artists: ["Mock Artist"],
    duration_ms: 200000,
    sourceIds: { spotify: "mock:1" },
  }],
};

export const youtubeMock = {
  search: async (query) => [{
    id: "yt-1",
    title: query,
    artists: ["Mock Channel"],
    duration_ms: 198000,
    sourceIds: { youtube: "yt:1" },
  }],
  createPlaylist: async ({ name }) => ({ id: `created-${name}` }),
  addItems: async () => {},
};
