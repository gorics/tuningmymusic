/**
 * Render YouTube quota usage hints.
 * @param {{ usage: { used: number, remaining: number, daily: number } }} props
 * @returns {HTMLElement}
 */
export function QuotaHint(props) {
  const container = document.createElement("div");
  container.className = "lb-alert lb-alert-warning";
  container.setAttribute("role", "note");
  container.innerHTML = `YouTube quota used: <strong>${props.usage.used}</strong> / ${props.usage.daily}. Remaining today: ${props.usage.remaining}.`;
  return container;
}
