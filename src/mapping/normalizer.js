import { STOPWORDS, FEATURE_WORDS, VERSION_TAGS, TOKEN_OPTIONS } from "./rules.js";

/**
 * Normalize text by lowering, trimming, removing punctuation and version tags.
 * @param {string} text
 * @param {string} [locale]
 * @returns {string}
 */
export function normalizeText(text, locale = "en") {
  if (!text) return "";
  const lower = text
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/g, (match) => (containsVersionTag(match) ? "" : match))
    .replace(/feat\.|ft\.|featuring/gi, " feat ")
    .replace(/["'`]/g, "")
    .replace(/&/g, " and ")
    .replace(/\s+/g, " ")
    .trim();
  const stopwords = STOPWORDS[locale] ?? [];
  const filtered = lower
    .split(TOKEN_OPTIONS.separators)
    .filter((token) => token && !stopwords.includes(token))
    .join(" ");
  return filtered.trim();
}

function containsVersionTag(text) {
  const lower = text.toLowerCase();
  return VERSION_TAGS.some((tag) => lower.includes(tag));
}

/**
 * Normalize artists list by splitting featuring terms.
 * @param {string[]} artists
 * @returns {string[]}
 */
export function normalizeArtists(artists) {
  const normalized = [];
  for (const artist of artists ?? []) {
    const tokens = artist
      .replace(/&/g, ",")
      .replace(/feat\.|ft\.|featuring/gi, ",")
      .split(/[,|]/)
      .map((token) => token.trim())
      .filter(Boolean);
    tokens.forEach((token) => normalized.push(token.toLowerCase()));
  }
  return Array.from(new Set(normalized));
}

/**
 * Normalize track metadata.
 * @param {import("../providers/provider.types.js").TrackSummary} track
 * @param {string} [locale]
 */
export function normalizeTrack(track, locale = "en") {
  return {
    ...track,
    normalizedTitle: normalizeText(track.title, locale),
    normalizedArtists: normalizeArtists(track.artists),
  };
}

/**
 * Build token set from normalized string.
 * @param {string} text
 * @returns {Set<string>}
 */
export function tokenize(text) {
  return new Set(text.split(TOKEN_OPTIONS.separators).filter(Boolean));
}

/**
 * Identify featuring artists from the original string.
 * @param {string} text
 * @returns {string[]}
 */
export function extractFeaturing(text) {
  const lower = text.toLowerCase();
  for (const keyword of FEATURE_WORDS) {
    const index = lower.indexOf(keyword);
    if (index >= 0) {
      const substring = lower.slice(index + keyword.length);
      return substring
        .split(/[,&]/)
        .map((part) => part.replace(/[^a-z0-9가-힣 ]/gi, "").trim())
        .filter(Boolean);
    }
  }
  return [];
}
