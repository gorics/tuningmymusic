import { LRUCache } from "../util.js";
import { normalizeTrack, extractFeaturing } from "./normalizer.js";
import { scoreMatch } from "./scorer.js";
import { SCORE_THRESHOLDS } from "./rules.js";

const cache = new LRUCache(200);

/**
 * Search target provider for candidate matches.
 * @param {import("../providers/provider.types.js").TrackSummary} sourceTrack
 * @param {{ providerName: string, search: (query: string) => Promise<import("../providers/provider.types.js").TrackSummary[]>, locale?: string }} context
 * @returns {Promise<{ best?: CandidateScore, candidates: CandidateScore[] }>}
 */
export async function findCandidates(sourceTrack, context) {
  const locale = context.locale ?? "en";
  const normalized = normalizeTrack(sourceTrack, locale);
  const queries = buildQueries(normalized);
  /** @type {Map<string, CandidateScore>} */
  const candidateMap = new Map();

  for (const query of queries) {
    const key = `${context.providerName}:${query}`;
    /** @type {import("../providers/provider.types.js").TrackSummary[]} */
    let results = cache.get(key);
    if (!results) {
      results = await context.search(query);
      cache.set(key, results);
    }
    for (const result of results) {
      const uniqueId = result.sourceIds?.[context.providerName] ?? result.id;
      if (!uniqueId || candidateMap.has(uniqueId)) continue;
      const scored = scoreMatch(sourceTrack, result, { locale });
      candidateMap.set(uniqueId, {
        track: result,
        score: scored.score,
        breakdown: scored.breakdown,
      });
    }
  }

  const candidates = [...candidateMap.values()].sort((a, b) => b.score - a.score);
  const best = candidates[0];
  return {
    best: best && best.score >= SCORE_THRESHOLDS.auto ? best : undefined,
    candidates,
  };
}

/**
 * Build prioritized search queries.
 * @param {ReturnType<typeof normalizeTrack>} track
 * @returns {string[]}
 */
function buildQueries(track) {
  const base = `${track.normalizedArtists[0] ?? ""} - ${track.normalizedTitle}`.trim();
  const queries = [base];
  if (track.normalizedArtists.length > 1) {
    queries.push(`${track.normalizedArtists.join(" ")} ${track.normalizedTitle}`);
  }
  const features = extractFeaturing(track.title ?? "");
  if (features.length) {
    queries.push(`${track.normalizedTitle} ${features.join(" ")}`);
  }
  queries.push(track.normalizedTitle);
  return Array.from(new Set(queries.filter(Boolean)));
}

/**
 * @typedef {Object} CandidateScore
 * @property {import("../providers/provider.types.js").TrackSummary} track
 * @property {number} score
 * @property {Record<string, number>} breakdown
 */
