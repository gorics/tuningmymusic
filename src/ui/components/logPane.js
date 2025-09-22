/**
 * Display log entries.
 * @param {{ entries: { level: string, message: string, timestamp: number }[] }} props
 * @returns {HTMLElement}
 */
export function LogPane(props) {
  const container = document.createElement("section");
  container.className = "lb-log-pane";
  container.setAttribute("data-card", "");

  const heading = document.createElement("h3");
  heading.textContent = "Activity log";
  container.appendChild(heading);

  const list = document.createElement("ul");
  if (!props.entries.length) {
    const empty = document.createElement("li");
    empty.textContent = "No log entries yet.";
    list.appendChild(empty);
  } else {
    props.entries.forEach((entry) => {
      const item = document.createElement("li");
      const time = new Date(entry.timestamp).toLocaleTimeString();
      item.textContent = `[${time}] ${entry.level.toUpperCase()} — ${entry.message}`;
      list.appendChild(item);
    });
  }
  container.appendChild(list);
  return container;
}
