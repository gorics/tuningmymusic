import { deepMerge, safeJsonParse, stringToBuffer } from "./util.js";

const STORAGE_KEY = "listbridge.state.v1";
const TOKEN_KEY = "listbridge.tokens.v1";
const RESUME_KEY = "listbridge.resume.v1";
const PERSIST_KEY = "listbridge.persistence.v1";

const defaultState = Object.freeze({
  locale: navigator.language.startsWith("ko") ? "ko" : "en",
  theme: "system",
  initialized: false,
  settings: {
    persistence: "session",
    rememberTokens: false,
  },
  tokens: {
    spotify: null,
    google: null,
  },
  user: {
    spotify: null,
    google: null,
  },
  source: null,
  playlists: [],
  selectedPlaylists: [],
  mapping: {
    normalized: {},
    matches: {},
    pending: [],
    failed: [],
    logs: [],
  },
  transfer: {
    status: "idle",
    progress: 0,
    total: 0,
    processed: 0,
    failures: [],
    report: null,
  },
});

/** @type {typeof defaultState} */
let state = structuredClone(defaultState);

/** @type {Set<(state: typeof state) => void>} */
const subscribers = new Set();

/** @type {{ mode: 'session' | 'local-encrypted', key?: CryptoKey, salt?: string }} */
let persistence = {
  mode: "session",
};

let initialLoadPromise;

/**
 * Initialize the global state by reading from storage.
 * @returns {Promise<void>}
 */
export function initState() {
  if (!initialLoadPromise) {
    initialLoadPromise = (async () => {
      const preference = safeJsonParse(localStorage.getItem(PERSIST_KEY), { mode: "session" });
      if (preference && preference.mode === "local-encrypted") {
        persistence.mode = "local-encrypted";
      }

      const sessionSnapshot = safeJsonParse(sessionStorage.getItem(STORAGE_KEY), null);
      if (sessionSnapshot) {
        applySnapshot(sessionSnapshot);
        const sessionTokens = safeJsonParse(sessionStorage.getItem(TOKEN_KEY), null);
        if (sessionTokens) state.tokens = sessionTokens;
      } else if (persistence.mode === "local-encrypted") {
        state.settings.persistence = "local-encrypted";
        state.settings.rememberTokens = true;
      }

      state.initialized = true;
      notify();
    })();
  }
  return initialLoadPromise;
}

/**
 * Subscribe to state changes.
 * @param {(state: typeof state) => void} listener
 * @returns {() => void}
 */
export function subscribe(listener) {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

function notify() {
  subscribers.forEach((listener) => listener(state));
}

/**
 * Get the current state snapshot.
 * @returns {typeof state}
 */
export function getState() {
  return state;
}

/**
 * Update the global state by merging the provided patch.
 * @param {Partial<typeof state>} patch
 */
export function updateState(patch) {
  state = deepMerge(state, patch);
  persistState();
  notify();
}

/**
 * Reset the application state and storage.
 */
export function resetState() {
  state = structuredClone(defaultState);
  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(RESUME_KEY);
  notify();
}

function applySnapshot(snapshot) {
  state = deepMerge(structuredClone(defaultState), snapshot);
}

function persistState() {
  const snapshot = {
    ...state,
    tokens: { spotify: null, google: null },
  };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  if (state.settings.persistence === "local-encrypted" && persistence.mode === "local-encrypted" && persistence.key) {
    const payload = JSON.stringify({
      snapshot,
      tokens: state.tokens,
    });
    encryptAndStore(payload, STORAGE_KEY, TOKEN_KEY).catch((error) => {
      console.error("Failed to persist encrypted state", error);
    });
  }
  sessionStorage.setItem(TOKEN_KEY, JSON.stringify(state.tokens));
  if (state.settings.persistence === "session") {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function encryptAndStore(payload, stateKey, tokenKey) {
  if (!persistence.key) return;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    persistence.key,
    stringToBuffer(payload)
  );
  const encoded = {
    iv: arrayBufferToBase64(iv.buffer),
    data: arrayBufferToBase64(data),
  };
  localStorage.setItem(stateKey, JSON.stringify(encoded));
  localStorage.setItem(tokenKey, JSON.stringify(encoded));
  localStorage.setItem(PERSIST_KEY, JSON.stringify({ mode: "local-encrypted", salt: persistence.salt }));
}

async function decryptStored(passphrase) {
  const stored = safeJsonParse(localStorage.getItem(STORAGE_KEY), null);
  if (!stored || !stored.iv || !stored.data) return null;
  const salt = safeJsonParse(localStorage.getItem(PERSIST_KEY), {}).salt;
  const key = await deriveKey(passphrase, salt);
  const buffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToArrayBuffer(stored.iv) },
    key,
    base64ToArrayBuffer(stored.data)
  );
  const decoded = new TextDecoder().decode(buffer);
  return { payload: JSON.parse(decoded), key, salt: salt || persistence.salt };
}

/**
 * Configure persistence mode.
 * @param {'session' | 'local-encrypted'} mode
 * @param {{ passphrase?: string }} [options]
 * @returns {Promise<void>}
 */
export async function setPersistence(mode, options = {}) {
  if (mode === "session") {
    persistence = { mode };
    state.settings.persistence = mode;
    state.settings.rememberTokens = false;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, tokens: { spotify: null, google: null } }));
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify(state.tokens));
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.setItem(PERSIST_KEY, JSON.stringify({ mode }));
    notify();
    return;
  }

  if (mode === "local-encrypted") {
    const passphrase = options.passphrase;
    if (!passphrase) throw new Error("Passphrase required for encrypted persistence");
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKey(passphrase, arrayBufferToBase64(salt.buffer));
    persistence = { mode, key, salt: arrayBufferToBase64(salt.buffer) };
    state.settings.persistence = mode;
    state.settings.rememberTokens = true;
    await encryptAndStore(
      JSON.stringify({ snapshot: state, tokens: state.tokens }),
      STORAGE_KEY,
      TOKEN_KEY
    );
    notify();
  }
}

/**
 * Attempt to unlock encrypted storage with a passphrase.
 * @param {string} passphrase
 * @returns {Promise<boolean>}
 */
export async function unlockEncryptedState(passphrase) {
  try {
    const decrypted = await decryptStored(passphrase);
    if (!decrypted) return false;
    persistence = { mode: "local-encrypted", key: decrypted.key, salt: decrypted.salt };
    const { snapshot, tokens } = decrypted.payload;
    applySnapshot(snapshot);
    state.tokens = tokens;
    state.settings.persistence = "local-encrypted";
    state.settings.rememberTokens = true;
    notify();
    return true;
  } catch (error) {
    console.error("unlockEncryptedState failed", error);
    return false;
  }
}

/**
 * Store a resume checkpoint.
 * @param {any} checkpoint
 */
export function saveResumeCheckpoint(checkpoint) {
  sessionStorage.setItem(RESUME_KEY, JSON.stringify(checkpoint));
  state.transfer.report = checkpoint;
  notify();
}

/**
 * Load checkpoint from storage.
 * @returns {any}
 */
export function loadResumeCheckpoint() {
  const checkpoint = safeJsonParse(sessionStorage.getItem(RESUME_KEY), null);
  if (checkpoint) {
    state.transfer.report = checkpoint;
  }
  return checkpoint;
}

export function clearResumeCheckpoint() {
  sessionStorage.removeItem(RESUME_KEY);
  state.transfer.report = null;
  notify();
}

/**
 * Set OAuth token for the provider.
 * @param {'spotify' | 'google'} provider
 * @param {import("./auth/oauth.js").TokenResponse | null} token
 */
export function setToken(provider, token) {
  state.tokens[provider] = token;
  persistState();
  notify();
}

export function getToken(provider) {
  return state.tokens[provider];
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deriveKey(passphrase, existingSalt) {
  const salt = existingSalt ? base64ToArrayBuffer(existingSalt) : crypto.getRandomValues(new Uint8Array(16)).buffer;
  const baseKey = await crypto.subtle.importKey("raw", stringToBuffer(passphrase), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 120_000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  return key;
}
