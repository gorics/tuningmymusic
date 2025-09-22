import assert from "node:assert/strict";
import { normalizeText, normalizeArtists } from "../src/mapping/normalizer.js";
import { scoreMatch } from "../src/mapping/scorer.js";

function run() {
  assert.equal(normalizeText("Song Title (Remastered 2011)"), "song title");
  assert.equal(normalizeText("라이브 버전" , "ko"), "");

  const artists = normalizeArtists(["Dreamstatic feat. Feather", "Analog Horizon"]);
  assert.deepEqual(artists, ["dreamstatic", "feather", "analog horizon"]);

  const source = {
    title: "City Lights",
    artists: ["Dreamstatic", "Feather"],
    duration_ms: 198000,
    release_year: 2020,
    explicit: false,
  };
  const candidate = {
    title: "City Lights (Official Video)",
    artists: ["Dreamstatic", "Feather"],
    duration_ms: 199000,
    release_year: 2020,
    explicit: false,
  };
  const { score } = scoreMatch(source, candidate);
  assert(score >= 75, "Expected confident match score");

  console.log("All mapping tests passed");
}

run();
