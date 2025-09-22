import { updateState, getState } from "../state.js";
import { findCandidates } from "../mapping/searcher.js";
import { announce } from "../util.js";
import { saveCheckpoint, clearCheckpoint } from "./resume.js";

/**
 * Transfer playlists to the target provider.
 * @param {{ collection: any, target: { providerName: string, createPlaylist: Function, addItems: Function, search: Function } }} options
 */
export async function transferCollection(options) {
  const { collection, target } = options;
  const state = getState();
  const matches = { ...state.mapping.matches };
  const totalTracks = collection.playlists.reduce((acc, playlist) => acc + (playlist.tracks?.length ?? 0), 0);
  const failures = [];
  let processed = 0;

  updateState({
    transfer: {
      ...state.transfer,
      status: "running",
      total: totalTracks,
      processed: 0,
      failures: [],
    },
  });

  for (const playlist of collection.playlists) {
    const targetPlaylist = await target.createPlaylist({
      name: `${playlist.name} · via ListBridge`,
      description: buildDescription(collection.source, playlist.description),
      visibility: playlist.visibility ?? "private",
    });
    updateState({
      mapping: {
        ...getState().mapping,
        logs: [
          ...getState().mapping.logs,
          { level: "info", message: `Created playlist ${targetPlaylist.id}`, timestamp: Date.now() },
        ],
      },
    });
    const mappedIds = [];

    for (const track of playlist.tracks ?? []) {
      processed += 1;
      const trackKey = getTrackKey(track);
      let selection = matches[trackKey];
      if (!selection) {
        const candidates = await findCandidates(track, {
          providerName: target.providerName,
          search: target.search,
          locale: state.locale,
        });
        if (candidates.best) {
          selection = candidates.best.track;
          matches[trackKey] = selection;
        } else {
          failures.push({ track, reason: "No confident match", candidates: candidates.candidates });
          updateState({
            mapping: {
              ...getState().mapping,
              logs: [
                ...getState().mapping.logs,
                { level: "warn", message: `No confident match for ${track.title}`, timestamp: Date.now() },
              ],
            },
          });
          continue;
        }
      }
      mappedIds.push(selection.sourceIds?.[target.providerName] ?? selection.id);
      updateState({
        transfer: {
          ...getState().transfer,
          processed,
        },
      });
    }

    if (mappedIds.length) {
      await target.addItems(targetPlaylist.id, mappedIds);
    }

    saveCheckpoint({
      playlistId: playlist.id,
      targetPlaylistId: targetPlaylist.id,
      processed,
      total: totalTracks,
      failures,
    });
  }

  updateState({
    mapping: { ...getState().mapping, matches },
    transfer: {
      status: "completed",
      total: totalTracks,
      processed,
      failures,
      report: {
        completedAt: Date.now(),
        failures,
      },
    },
  });
  clearCheckpoint();
  announce("재생목록 전송이 완료되었습니다.");
}

function buildDescription(sourceName, existingDescription = "") {
  const date = new Date().toISOString();
  return `${existingDescription}\n\nImported from ${sourceName ?? "unknown"} via ListBridge on ${date}`.trim();
}

function getTrackKey(track) {
  return track.sourceIds?.spotify ?? track.sourceIds?.youtube ?? track.id;
}
