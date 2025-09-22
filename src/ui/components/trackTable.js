import { formatDuration } from "../../util.js";

const ROW_HEIGHT = 44;

/**
 * Virtualized track table.
 * @param {{ tracks: any[] }} props
 */
export function TrackTable(props) {
  const container = document.createElement("div");
  container.className = "lb-table-container";
  container.setAttribute("data-card", "");

  const viewport = document.createElement("div");
  viewport.className = "lb-table-virtual";

  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th scope="col">#</th>
        <th scope="col">Title</th>
        <th scope="col">Artists</th>
        <th scope="col">Album</th>
        <th scope="col">Duration</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const spacer = document.createElement("div");
  spacer.style.height = `${props.tracks.length * ROW_HEIGHT}px`;
  spacer.style.position = "relative";

  const tbody = table.querySelector("tbody");

  viewport.addEventListener("scroll", () => render());

  function render() {
    const scrollTop = viewport.scrollTop;
    const startIndex = Math.floor(scrollTop / ROW_HEIGHT);
    const visibleCount = Math.ceil(viewport.clientHeight / ROW_HEIGHT) + 4;
    const endIndex = Math.min(props.tracks.length, startIndex + visibleCount);
    const offsetY = startIndex * ROW_HEIGHT;
    tbody.style.transform = `translateY(${offsetY}px)`;
    tbody.innerHTML = "";
    for (let index = startIndex; index < endIndex; index += 1) {
      const track = props.tracks[index];
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${track.title}</td>
        <td>${track.artists?.join(", ") ?? ""}</td>
        <td>${track.album ?? ""}</td>
        <td>${track.duration_ms ? formatDuration(track.duration_ms) : ""}</td>
      `;
      tbody.appendChild(row);
    }
  }

  spacer.appendChild(table);
  viewport.appendChild(spacer);
  container.appendChild(viewport);
  requestAnimationFrame(render);
  return container;
}
