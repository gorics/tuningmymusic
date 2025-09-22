import { normalizeTrack, tokenize } from "./normalizer.js";
import { YEAR_TOLERANCE } from "./rules.js";

/**
 * Compute a similarity score between two tracks.
 * @param {import("../providers/provider.types.js").TrackSummary} source
 * @param {import("../providers/provider.types.js").TrackSummary} candidate
 * @param {{ locale?: string }} [options]
 * @returns {{ score: number, breakdown: Record<string, number> }}
 */
export function scoreMatch(source, candidate, options = {}) {
  const locale = options.locale ?? "en";
  const normalizedSource = normalizeTrack(source, locale);
  const normalizedCandidate = normalizeTrack(candidate, locale);

  const titleScore = computeTitleScore(normalizedSource.normalizedTitle, normalizedCandidate.normalizedTitle);
  const artistScore = computeArtistScore(normalizedSource.normalizedArtists, normalizedCandidate.normalizedArtists);
  const durationScore = computeDurationScore(source.duration_ms, candidate.duration_ms);
  const yearScore = computeYearScore(source.release_year, candidate.release_year);
  const explicitScore = computeExplicitScore(source.explicit, candidate.explicit);

  const score = titleScore + artistScore + durationScore + yearScore + explicitScore;
  return {
    score,
    breakdown: {
      title: titleScore,
      artist: artistScore,
      duration: durationScore,
      year: yearScore,
      explicit: explicitScore,
    },
  };
}

function computeTitleScore(a, b) {
  if (!a || !b) return 0;
  const jw = jaroWinkler(a, b);
  const token = tokenSetRatio(a, b);
  return Math.round((jw * 0.6 + token * 0.4) * 50);
}

function computeArtistScore(a, b) {
  if (!a?.length || !b?.length) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter((value) => setB.has(value));
  const union = new Set([...setA, ...setB]).size;
  const ratio = intersection.length / union;
  return Math.round(ratio * 30);
}

function computeDurationScore(a, b) {
  if (!a || !b) return 0;
  const diff = Math.abs(a - b);
  if (diff <= 2000) return 10;
  if (diff >= 20000) return 0;
  return Math.max(0, Math.round(10 - diff / 2000));
}

function computeYearScore(a, b) {
  if (!a || !b) return 0;
  const diff = Math.abs(a - b);
  if (diff > YEAR_TOLERANCE) return 0;
  return Math.round(5 - diff * 2.5);
}

function computeExplicitScore(a, b) {
  if (a === undefined || b === undefined) return 0;
  return a === b ? 5 : 0;
}

function tokenSetRatio(a, b) {
  const setA = tokenize(a);
  const setB = tokenize(b);
  const intersection = [...setA].filter((value) => setB.has(value));
  const ratio = intersection.length / Math.max(setA.size, setB.size, 1);
  const jw = jaroWinkler(a, b);
  return (ratio * 0.5 + jw * 0.5);
}

function jaroWinkler(a, b) {
  if (a === b) return 1;
  const aLen = a.length;
  const bLen = b.length;
  if (aLen === 0 || bLen === 0) return 0;
  const matchDistance = Math.floor(Math.max(aLen, bLen) / 2) - 1;

  const aMatches = new Array(aLen).fill(false);
  const bMatches = new Array(bLen).fill(false);
  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < aLen; i += 1) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, bLen);
    for (let j = start; j < end; j += 1) {
      if (bMatches[j]) continue;
      if (a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches += 1;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < aLen; i += 1) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k += 1;
    if (a[i] !== b[k]) transpositions += 1;
    k += 1;
  }

  const jaro =
    (matches / aLen + matches / bLen + (matches - transpositions / 2) / matches) / 3;

  let prefix = 0;
  const maxPrefix = 4;
  for (let i = 0; i < Math.min(maxPrefix, aLen, bLen); i += 1) {
    if (a[i] === b[i]) prefix += 1;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}
