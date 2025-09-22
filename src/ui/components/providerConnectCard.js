import { translate } from "../i18n.js";

/**
 * Render provider connect card.
 * @param {{ provider: 'spotify' | 'google', locale: string, icon: string, token: any, canConnect?: boolean, disabledMessage?: string, onConnect: () => void, onDisconnect: () => void }} props
 * @returns {HTMLElement}
 */
export function ProviderConnectCard(props) {
  const card = document.createElement("div");
  card.setAttribute("data-card", "");
  card.className = "lb-provider-card";
  const canConnect = props.canConnect ?? true;
  const disabledReason = !canConnect ? props.disabledMessage : null;

  const header = document.createElement("header");
  header.className = "lb-card-header";

  const title = document.createElement("h2");
  title.className = "lb-card-title";
  title.textContent = props.provider === "spotify" ? "Spotify" : "YouTube";

  const status = document.createElement("span");
  status.className = "lb-pill";
  status.textContent = props.token ? "Connected" : "Disconnected";
  status.setAttribute("role", "status");

  header.append(title, status);

  const description = document.createElement("p");
  description.className = "lb-card-subtitle";
  description.textContent =
    props.provider === "spotify"
      ? "Authorize ListBridge to read and create Spotify playlists via the official API."
      : "Authorize ListBridge to manage YouTube playlists using OAuth 2.1.";

  const buttonGroup = document.createElement("div");
  buttonGroup.className = "lb-button-row";

  const connectBtn = document.createElement("button");
  connectBtn.type = "button";
  connectBtn.textContent =
    props.provider === "spotify"
      ? translate("connect_spotify", props.locale)
      : translate("connect_google", props.locale);
  connectBtn.addEventListener("click", () => {
    if (connectBtn.disabled) return;
    props.onConnect();
  });
  connectBtn.disabled = Boolean(props.token) || !canConnect;
  connectBtn.setAttribute("aria-disabled", String(connectBtn.disabled));
  if (disabledReason) {
    connectBtn.title = disabledReason;
  }

  const disconnectBtn = document.createElement("button");
  disconnectBtn.type = "button";
  disconnectBtn.className = "lb-button-secondary";
  disconnectBtn.textContent = translate("disconnect", props.locale);
  disconnectBtn.disabled = !props.token;
  disconnectBtn.addEventListener("click", () => props.onDisconnect());

  buttonGroup.append(connectBtn, disconnectBtn);
  card.append(header, description);
  if (disabledReason) {
    const hint = document.createElement("p");
    hint.className = "lb-card-hint";
    hint.textContent = disabledReason;
    card.appendChild(hint);
  }
  card.append(buttonGroup);
  return card;
}
