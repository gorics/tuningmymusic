import { debounce } from "../../util.js";

/**
 * Playlist selection component.
 * @param {{ playlists: any[], selectedIds: Set<string>, onChange: (ids: Set<string>) => void }} props
 */
export function PlaylistPicker(props) {
  const container = document.createElement("div");
  container.setAttribute("data-card", "");

  const searchInput = document.createElement("input");
  searchInput.type = "search";
  searchInput.placeholder = "Search playlists";
  searchInput.setAttribute("aria-label", "Search playlists");

  const list = document.createElement("ul");
  list.className = "lb-playlist-list";
  list.setAttribute("role", "listbox");
  list.tabIndex = 0;

  const render = () => {
    list.innerHTML = "";
    const query = searchInput.value.toLowerCase();
    props.playlists
      .filter((playlist) => playlist.name.toLowerCase().includes(query))
      .forEach((playlist) => {
        const item = document.createElement("li");
        item.className = "lb-playlist-item";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = props.selectedIds.has(playlist.id);
        checkbox.id = `playlist-${playlist.id}`;
        checkbox.addEventListener("change", () => {
          if (checkbox.checked) props.selectedIds.add(playlist.id);
          else props.selectedIds.delete(playlist.id);
          props.onChange(new Set(props.selectedIds));
        });

        const label = document.createElement("label");
        label.htmlFor = checkbox.id;
        label.innerHTML = `<strong>${playlist.name}</strong><br/><small>${playlist.trackCount ?? 0} tracks</small>`;

        item.append(checkbox, label);
        list.appendChild(item);
      });
  };

  searchInput.addEventListener(
    "input",
    debounce(() => {
      render();
    }, 200)
  );

  const actions = document.createElement("div");
  actions.className = "lb-button-row";

  const selectAll = document.createElement("button");
  selectAll.type = "button";
  selectAll.textContent = "Select all";
  selectAll.addEventListener("click", () => {
    props.playlists.forEach((playlist) => props.selectedIds.add(playlist.id));
    props.onChange(new Set(props.selectedIds));
    render();
  });

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "lb-button-secondary";
  clearBtn.textContent = "Clear";
  clearBtn.addEventListener("click", () => {
    props.selectedIds.clear();
    props.onChange(new Set());
    render();
  });

  actions.append(selectAll, clearBtn);
  container.append(searchInput, list, actions);
  render();
  return container;
}
