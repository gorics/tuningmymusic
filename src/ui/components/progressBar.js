/**
 * Render progress bar component.
 * @param {{ label: string }} props
 * @returns {{ element: HTMLElement, setProgress: (value: number, max: number) => void }}
 */
export function ProgressBar(props) {
  const wrapper = document.createElement("div");
  wrapper.setAttribute("data-card", "");

  const label = document.createElement("div");
  label.textContent = props.label;
  label.className = "lb-progress-label";

  const progress = document.createElement("div");
  progress.className = "lb-progress";
  progress.setAttribute("role", "progressbar");
  progress.setAttribute("aria-valuemin", "0");

  const bar = document.createElement("div");
  bar.className = "lb-progress-bar";
  progress.appendChild(bar);

  wrapper.append(label, progress);

  return {
    element: wrapper,
    setProgress(value, max) {
      const ratio = max > 0 ? Math.min(1, value / max) : 0;
      bar.style.width = `${Math.round(ratio * 100)}%`;
      bar.setAttribute("aria-valuenow", String(value));
      bar.setAttribute("aria-valuemax", String(max));
    },
  };
}
