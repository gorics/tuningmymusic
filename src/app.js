import { initState, subscribe, getState, updateState, setPersistence, unlockEncryptedState } from "./state.js";
import { initRouter, registerRoute, rerender } from "./ui/router.js";
import { ProviderConnectCard } from "./ui/components/providerConnectCard.js";
import { PlaylistPicker } from "./ui/components/playlistPicker.js";
import { TrackTable } from "./ui/components/trackTable.js";
import { MatchReview } from "./ui/components/matchReview.js";
import { ProgressBar } from "./ui/components/progressBar.js";
import { LogPane } from "./ui/components/logPane.js";
import { QuotaHint } from "./ui/components/quotaHint.js";
import { authorizeSpotify, handleSpotifyRedirect, disconnectSpotify } from "./auth/spotifyAuth.js";
import { authorizeGoogle, handleGoogleRedirect, disconnectGoogle } from "./auth/googleAuth.js";
import * as spotifyProvider from "./providers/spotify.js";
import * as youtubeProvider from "./providers/youtube.js";
import { exportAsCSV, exportAsJSON } from "./workflow/export.js";
import { importFromJSON, importFromCSV } from "./workflow/import.js";
import { transferCollection } from "./workflow/transfer.js";
import { getCheckpoint, clearCheckpoint } from "./workflow/resume.js";
import { getConfig } from "./config.js";
import { translate } from "./ui/i18n.js";
import { findCandidates } from "./mapping/searcher.js";
import { toCSV, downloadFile, announce } from "./util.js";

const appNode = document.getElementById("app");
const themeToggle = document.getElementById("theme-toggle");
const yearNode = document.querySelector('[data-bind="year"]');
if (yearNode) yearNode.textContent = String(new Date().getFullYear());

initState().then(async () => {
  await detectCallback();
  registerRoutes();
  initRouter(appNode);
  setupThemeToggle();
  renderNavState();
  subscribe(() => {
    renderNavState();
    rerender();
  });
});

async function detectCallback() {
  const hash = window.location.hash;
  if (hash.startsWith("#callback/spotify")) {
    const search = hash.split("?")[1] ?? "";
    const url = `${window.location.origin}${window.location.pathname}?${search}`;
    await handleSpotifyRedirect(url);
    window.location.hash = "#/connect";
  }
  if (hash.startsWith("#callback/google")) {
    const search = hash.split("?")[1] ?? "";
    const url = `${window.location.origin}${window.location.pathname}?${search}`;
    await handleGoogleRedirect(url);
    window.location.hash = "#/connect";
  }
}

function registerRoutes() {
  registerRoute("/", () => {
    const state = getState();
    const container = document.createElement("section");
    container.className = "lb-hero";
    const text = document.createElement("div");
    text.innerHTML = `
      <h1>${translate("welcome_title", state.locale)}</h1>
      <p>${translate("welcome_subtitle", state.locale)}</p>
      <p class="lb-language-switcher">
        Language:
        <select id="locale-switcher">
          <option value="en">English</option>
          <option value="ko">한국어</option>
        </select>
      </p>
    `;
    const banner = maybeResumeBanner();
    const illustration = document.createElement("div");
    illustration.innerHTML = `
      <img src="./assets/icons/listbridge.svg" alt="ListBridge logo" style="max-width: 280px;" />
    `;
    container.append(text, illustration);
    if (banner) container.appendChild(banner);

    setTimeout(() => {
      const switcher = document.getElementById("locale-switcher");
      if (switcher) {
        switcher.value = state.locale;
        switcher.addEventListener("change", (event) => {
          updateState({ locale: event.target.value });
        });
      }
    }, 0);
    return container;
  });

  registerRoute("/connect", () => {
    const state = getState();
    const config = getConfig();
    const container = document.createElement("div");
    container.className = "lb-grid";

    const introCard = document.createElement("div");
    introCard.setAttribute("data-card", "");

    const introTitle = document.createElement("h2");
    introTitle.textContent = translate("connect_title", state.locale);

    const introBody = document.createElement("p");
    introBody.textContent =
      "ListBridge opens the official Spotify and Google authorization dialogs. Update oauth.config.js with your client IDs so the pop-ups can launch immediately.";

    const statusList = document.createElement("ul");
    statusList.className = "lb-status-list";
    statusList.appendChild(createStatusItem("Spotify Client ID", config.spotify.clientId));
    statusList.appendChild(createStatusItem("Google Client ID", config.google.clientId));

    const redirectLabel = document.createElement("p");
    redirectLabel.className = "hint";
    redirectLabel.textContent = "Redirect URIs to register:";

    const redirectContainer = document.createElement("div");
    const spotifyRedirect = document.createElement("code");
    spotifyRedirect.textContent = config.spotify.redirectUri;
    const googleRedirect = document.createElement("code");
    googleRedirect.textContent = config.google.redirectUri;
    redirectContainer.append(spotifyRedirect, document.createElement("br"), googleRedirect);

    const docsHint = document.createElement("p");
    docsHint.className = "lb-card-hint";
    docsHint.innerHTML =
      'Guides: <a href="./docs/OAUTH_SETUP_SPOTIFY.md" target="_blank" rel="noopener">Spotify OAuth</a> · <a href="./docs/OAUTH_SETUP_GOOGLE.md" target="_blank" rel="noopener">Google OAuth</a>';

    introCard.append(introTitle, introBody, statusList, redirectLabel, redirectContainer, docsHint);

    const configCard = document.createElement("div");
    configCard.setAttribute("data-card", "");
    configCard.innerHTML = `
      <h2>Configure OAuth client IDs</h2>
      <p>Edit <code>oauth.config.js</code> in the project root and set your Spotify and Google client IDs before deploying. The file loads before the app so the sign-in buttons know which application to launch.</p>
      <pre><code>window.OAUTH_CONFIG = {
  spotify: { clientId: "YOUR_SPOTIFY_CLIENT_ID" },
  google: { clientId: "YOUR_GOOGLE_CLIENT_ID" }
};</code></pre>
      <p class="lb-card-hint">Client IDs are public identifiers—never add client secrets.</p>
    `;

    const spotifyCard = ProviderConnectCard({
      provider: "spotify",
      locale: state.locale,
      icon: "./assets/icons/spotify.svg",
      token: state.tokens.spotify,
      canConnect: Boolean(config.spotify.clientId),
      disabledMessage: translate("connect_client_id_hint", state.locale),
      onConnect: () => authorizeSpotify().catch(showError),
      onDisconnect: () => disconnectSpotify(),
    });
    const googleCard = ProviderConnectCard({
      provider: "google",
      locale: state.locale,
      icon: "./assets/icons/youtube.svg",
      token: state.tokens.google,
      canConnect: Boolean(config.google.clientId),
      disabledMessage: translate("connect_client_id_hint", state.locale),
      onConnect: () => authorizeGoogle().catch(showError),
      onDisconnect: () => disconnectGoogle(),
    });

    const persistenceForm = document.createElement("form");
    persistenceForm.setAttribute("data-card", "");
    persistenceForm.innerHTML = `
      <h2>Token storage</h2>
      <p>Tokens are stored in sessionStorage by default. Provide a passphrase to enable encrypted localStorage persistence on this device.</p>
      <label>Passphrase <input type="password" name="passphrase" autocomplete="new-password" /></label>
      <div class="lb-button-row">
        <button type="button" id="enable-encrypted">Enable encrypted storage</button>
        <button type="button" id="disable-encrypted" class="lb-button-secondary">Use session only</button>
      </div>
    `;

    setTimeout(() => attachPersistenceListeners(persistenceForm), 0);

    container.append(introCard, configCard, spotifyCard, googleCard, persistenceForm);
    return container;

    function createStatusItem(label, clientId) {
      const item = document.createElement("li");
      if (!clientId) {
        item.textContent = `${label}: Not configured (edit oauth.config.js)`;
      } else {
        const trimmed = String(clientId).trim();
        const masked = trimmed.length > 8 ? `…${trimmed.slice(-6)}` : trimmed;
        item.textContent = `${label}: Configured (${masked})`;
      }
      return item;
    }

  });

  registerRoute("/select", () => {
    const state = getState();
    const container = document.createElement("div");
    container.className = "lb-grid";

    const sourceActions = document.createElement("div");
    sourceActions.setAttribute("data-card", "");
    sourceActions.innerHTML = `
      <h2>Select source</h2>
      <div class="lb-button-row">
        <button type="button" id="load-spotify">Load Spotify playlists</button>
        <label class="lb-button-secondary" id="import-json">${translate("import_json", state.locale)}<input type="file" accept="application/json" hidden /></label>
        <label class="lb-button-secondary" id="import-csv">${translate("import_csv", state.locale)}<input type="file" accept=".csv" hidden multiple /></label>
      </div>
    `;
    container.appendChild(sourceActions);

    if (state.playlists.length) {
      const picker = PlaylistPicker({
        playlists: state.playlists,
        selectedIds: new Set(state.selectedPlaylists),
        onChange: (selected) => updateState({ selectedPlaylists: [...selected] }),
      });
      container.appendChild(picker);

      const previewPlaylist = state.playlists.find((playlist) => state.selectedPlaylists.includes(playlist.id));
      if (previewPlaylist) {
        if (!previewPlaylist.tracks && state.source === "spotify") {
          spotifyProvider
            .readTracks(previewPlaylist.id)
            .then((tracks) => {
              const updated = getState().playlists.map((p) => (p.id === previewPlaylist.id ? { ...p, tracks } : p));
              updateState({ playlists: updated });
              rerender();
            })
            .catch(showError);
        }
        const table = TrackTable({ tracks: previewPlaylist.tracks ?? [] });
        container.appendChild(table);
      }
    }

    const exportActions = document.createElement("div");
    exportActions.setAttribute("data-card", "");
    exportActions.innerHTML = `
      <h2>Export</h2>
      <div class="lb-button-row">
        <button type="button" id="export-json">${translate("export_json", state.locale)}</button>
        <button type="button" id="export-csv">${translate("export_csv", state.locale)}</button>
      </div>
    `;
    container.appendChild(exportActions);

    setTimeout(() => attachSelectListeners(sourceActions, exportActions), 0);
    return container;
  });

  registerRoute("/map", () => {
    const state = getState();
    const container = document.createElement("div");
    container.className = "lb-grid";

    const actions = document.createElement("div");
    actions.setAttribute("data-card", "");
    actions.innerHTML = `<h2>${translate("map_title", state.locale)}</h2><button type="button" id="auto-map">Run auto matching</button>`;
    container.appendChild(actions);

    const pending = state.mapping.pending;
    if (pending.length) {
      const review = MatchReview({
        track: pending[0].track,
        candidates: pending[0].candidates,
        onSelect: (candidate) => {
          const key = getTrackKey(pending[0].track);
          const current = getState().mapping;
          const matches = { ...current.matches, [key]: candidate };
          const rest = pending.slice(1);
          const logs = [
            ...current.logs,
            { level: "info", message: `Manual match selected for ${pending[0].track.title}`, timestamp: Date.now() },
          ];
          updateState({ mapping: { ...current, matches, pending: rest, logs } });
          rerender();
        },
      });
      container.appendChild(review);
    } else {
      const info = document.createElement("p");
      info.textContent = "All tracks matched. You can proceed to transfer.";
      container.appendChild(info);
    }

    setTimeout(() => {
      const button = document.getElementById("auto-map");
      if (button) button.addEventListener("click", () => runAutoMapping().catch(showError));
    }, 0);
    return container;
  });

  registerRoute("/transfer", () => {
    const state = getState();
    const container = document.createElement("div");
    container.className = "lb-grid";
    const progress = ProgressBar({ label: translate("transfer_title", state.locale) });
    progress.setProgress(state.transfer.processed, state.transfer.total);
    container.appendChild(progress.element);

    if (state.mapping.pending.length) {
      const warning = document.createElement("div");
      warning.className = "lb-alert lb-alert-warning";
      warning.textContent = `${state.mapping.pending.length} tracks still require manual review.`;
      container.appendChild(warning);
    }

    const startBtn = document.createElement("button");
    startBtn.type = "button";
    startBtn.textContent = "Start transfer";
    startBtn.addEventListener("click", () => {
      startBtn.disabled = true;
      startTransfer(progress).finally(() => {
        startBtn.disabled = false;
      });
    });
    container.appendChild(startBtn);

    const quota = QuotaHint({ usage: youtubeProvider.getQuotaUsage() });
    container.appendChild(quota);
    return container;
  });

  registerRoute("/report", () => {
    const state = getState();
    const container = document.createElement("div");
    container.className = "lb-grid";
    container.appendChild(LogPane({ entries: state.mapping.logs }));
    const summary = document.createElement("div");
    summary.setAttribute("data-card", "");
    summary.innerHTML = `
      <h2>${translate("report_title", state.locale)}</h2>
      <p>Total processed: ${state.transfer.processed}</p>
      <p>Failures: ${state.transfer.failures.length}</p>
    `;
    if (state.transfer.failures.length) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Export failures CSV";
      button.addEventListener("click", () => exportFailures(state.transfer.failures));
      summary.appendChild(button);
    }
    container.appendChild(summary);
    return container;
  });
}

function attachSelectListeners(sourceActions, exportActions) {
  const loadSpotifyBtn = sourceActions.querySelector("#load-spotify");
  if (loadSpotifyBtn) {
    loadSpotifyBtn.addEventListener("click", async () => {
      try {
        const playlists = await spotifyProvider.listPlaylists();
        updateState({ source: "spotify", playlists });
        rerender();
      } catch (error) {
        showError(error);
      }
    });
  }

  const importJsonLabel = sourceActions.querySelector("#import-json");
  if (importJsonLabel) {
    const input = importJsonLabel.querySelector("input");
    input.addEventListener("change", async () => {
      if (!input.files?.length) return;
      const data = await importFromJSON(input.files[0]);
      updateState({ source: data.source ?? "json", playlists: data.playlists ?? [] });
      rerender();
    });
  }

  const importCsvLabel = sourceActions.querySelector("#import-csv");
  if (importCsvLabel) {
    const input = importCsvLabel.querySelector("input");
    input.addEventListener("change", async () => {
      if (!input.files?.length) return;
      const playlistsFile = Array.from(input.files).find((file) => file.name.includes("playlists"));
      const tracksFile = Array.from(input.files).find((file) => file.name.includes("tracks"));
      if (!playlistsFile || !tracksFile) {
        showError(new Error("Please provide playlists.csv and tracks.csv"));
        return;
      }
      const data = await importFromCSV({ playlists: playlistsFile, tracks: tracksFile });
      updateState({ source: data.source, playlists: data.playlists });
      rerender();
    });
  }

  const exportJsonBtn = exportActions.querySelector("#export-json");
  if (exportJsonBtn) {
    exportJsonBtn.addEventListener("click", () => {
      const state = getState();
      exportAsJSON({ source: state.source, playlists: state.playlists, fetchedAt: Date.now() });
    });
  }
  const exportCsvBtn = exportActions.querySelector("#export-csv");
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener("click", () => {
      const state = getState();
      exportAsCSV({ source: state.source, playlists: state.playlists });
    });
  }
}

function attachPersistenceListeners(form) {
  const enableBtn = form.querySelector("#enable-encrypted");
  const disableBtn = form.querySelector("#disable-encrypted");
  const passphraseInput = form.querySelector('input[name="passphrase"]');

  const localActive = getState().settings.persistence === "local-encrypted";

  if (enableBtn) {
    if (localActive) enableBtn.textContent = "Unlock encrypted storage";
    enableBtn.addEventListener("click", async () => {
      const passphrase = passphraseInput?.value;
      if (!passphrase) {
        showToast("Enter a passphrase first");
        return;
      }
      try {
        if (localActive) {
          const unlocked = await unlockEncryptedState(passphrase);
          if (unlocked) showToast("Encrypted storage unlocked");
          else showToast("Passphrase incorrect");
        } else {
          await setPersistence("local-encrypted", { passphrase });
          showToast("Encrypted storage enabled");
        }
      } catch (error) {
        showError(error);
      }
    });
  }

  if (disableBtn) {
    disableBtn.addEventListener("click", async () => {
      await setPersistence("session");
      showToast("Reverted to session storage");
    });
  }

  if (localActive) {
    const banner = document.createElement("p");
    banner.textContent = "Encrypted storage is active. Provide your passphrase to unlock this browser.";
    form.appendChild(banner);
  }
}

async function runAutoMapping() {
  const state = getState();
  const selectedPlaylists = state.playlists.filter((playlist) => state.selectedPlaylists.includes(playlist.id));
  const pending = [];
  const matches = { ...state.mapping.matches };
  for (const playlist of selectedPlaylists) {
    if (!playlist.tracks || !playlist.tracks.length) {
      if (state.source === "spotify") {
        try {
          const tracks = await spotifyProvider.readTracks(playlist.id);
          playlist.tracks = tracks;
          const updated = state.playlists.map((p) => (p.id === playlist.id ? { ...p, tracks } : p));
          updateState({ playlists: updated });
        } catch (error) {
          showError(error);
        }
      }
    }
    for (const track of playlist.tracks ?? []) {
      const key = getTrackKey(track);
      if (matches[key]) continue;
      const candidates = await findCandidates(track, {
        providerName: "youtube",
        search: youtubeProvider.search,
        locale: state.locale,
      });
      if (candidates.best) {
        matches[key] = candidates.best.track;
      } else {
        pending.push({ track, candidates: candidates.candidates });
      }
    }
  }
  updateState({ mapping: { matches, pending, logs: [...state.mapping.logs, { level: "info", message: "Auto mapping completed", timestamp: Date.now() }] } });
}

async function startTransfer(progress) {
  const state = getState();
  const selectedPlaylists = state.playlists.filter((playlist) => state.selectedPlaylists.includes(playlist.id));
  try {
    await transferCollection({
      collection: { source: state.source, playlists: selectedPlaylists },
      target: {
        providerName: "youtube",
        createPlaylist: youtubeProvider.createPlaylist,
        addItems: youtubeProvider.addItems,
        search: youtubeProvider.search,
      },
    });
    const newState = getState();
    progress.setProgress(newState.transfer.processed, newState.transfer.total);
  } catch (error) {
    showError(error);
  }
}

function renderNavState() {
  const checkpoint = getCheckpoint();
  const banner = document.querySelector("#resume-banner");
  if (banner) banner.remove();
  if (checkpoint) {
    const element = document.createElement("div");
    element.id = "resume-banner";
    element.className = "lb-alert lb-alert-warning";
    element.textContent = translate("resume_banner", getState().locale);
    const resumeBtn = document.createElement("button");
    resumeBtn.type = "button";
    resumeBtn.className = "lb-button-secondary";
    resumeBtn.textContent = "Resume";
    resumeBtn.addEventListener("click", () => {
      window.location.hash = "#/transfer";
    });
    const dismissBtn = document.createElement("button");
    dismissBtn.type = "button";
    dismissBtn.className = "lb-button-secondary";
    dismissBtn.textContent = "Dismiss";
    dismissBtn.addEventListener("click", () => {
      clearCheckpoint();
      renderNavState();
    });
    element.append(resumeBtn, dismissBtn);
    document.body.insertBefore(element, document.body.firstChild);
  }
}

function maybeResumeBanner() {
  const checkpoint = getCheckpoint();
  if (!checkpoint) return null;
  const banner = document.createElement("div");
  banner.className = "lb-alert lb-alert-warning";
  banner.textContent = translate("resume_banner", getState().locale);
  const resume = document.createElement("button");
  resume.type = "button";
  resume.className = "lb-button-secondary";
  resume.textContent = "Resume";
  resume.addEventListener("click", () => (window.location.hash = "#/transfer"));
  banner.appendChild(resume);
  return banner;
}

function setupThemeToggle() {
  if (!themeToggle) return;
  updateThemeToggleButton();
  themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") ?? "system";
    const next = current === "dark" ? "light" : current === "light" ? "system" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    updateThemeToggleButton();
  });
}

function updateThemeToggleButton() {
  if (!themeToggle) return;
  const current = document.documentElement.getAttribute("data-theme") ?? "system";
  const icon = current === "dark" ? "🌙" : current === "light" ? "☀️" : "🌓";
  const next = current === "dark" ? "light" : current === "light" ? "system" : "dark";
  themeToggle.textContent = icon;
  themeToggle.setAttribute("title", `Toggle color scheme (current: ${current}, next: ${next})`);
  themeToggle.setAttribute("aria-label", `Toggle color scheme (next: ${next})`);
}

function showError(error) {
  console.error(error);
  showToast(error.message ?? "Unexpected error");
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "lb-alert lb-alert-warning";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function getTrackKey(track) {
  return track.sourceIds?.spotify ?? track.sourceIds?.youtube ?? track.id;
}

function exportFailures(failures) {
  const rows = failures.map((item, index) => ({
    index: index + 1,
    title: item.track.title,
    artists: item.track.artists?.join("; ") ?? "",
    reason: item.reason,
  }));
  const csv = toCSV(rows);
  downloadFile([csv], "transfer-failures.csv", "text/csv");
}
