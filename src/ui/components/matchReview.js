import { formatDuration } from "../../util.js";

/**
 * Match review component for manual selection.
 * @param {{ track: any, candidates: any[], onSelect: (candidate: any) => void }} props
 */
export function MatchReview(props) {
  const container = document.createElement("div");
  container.className = "lb-match-review";
  container.setAttribute("data-card", "");

  const original = document.createElement("section");
  original.innerHTML = `
    <h3>Original track</h3>
    <p><strong>${props.track.title}</strong></p>
    <p>${props.track.artists?.join(", ") ?? ""}</p>
    <p>${props.track.album ?? ""}</p>
    <p>${props.track.duration_ms ? formatDuration(props.track.duration_ms) : ""}</p>
  `;

  const candidateList = document.createElement("div");
  candidateList.className = "lb-match-candidates";
  candidateList.setAttribute("role", "listbox");

  props.candidates.forEach((candidate) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "lb-match-candidate";
    item.setAttribute("role", "option");
    item.innerHTML = `
      <span><strong>${candidate.track.title}</strong></span>
      <span>${candidate.track.artists?.join(", ") ?? ""}</span>
      <span>${candidate.track.album ?? ""}</span>
      <span>Score: ${candidate.score}</span>
    `;
    item.addEventListener("click", () => props.onSelect(candidate.track));
    candidateList.appendChild(item);
  });

  container.append(original, candidateList);
  return container;
}
