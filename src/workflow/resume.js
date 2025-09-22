import { saveResumeCheckpoint, loadResumeCheckpoint, clearResumeCheckpoint } from "../state.js";

/**
 * Persist transfer progress so that the user can resume later.
 * @param {any} checkpoint
 */
export function saveCheckpoint(checkpoint) {
  saveResumeCheckpoint({
    ...checkpoint,
    savedAt: Date.now(),
  });
}

export function getCheckpoint() {
  return loadResumeCheckpoint();
}

export function clearCheckpoint() {
  clearResumeCheckpoint();
}

export function hasCheckpoint() {
  return Boolean(loadResumeCheckpoint());
}
