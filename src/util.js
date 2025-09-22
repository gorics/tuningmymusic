/**
 * Utility helpers shared across the ListBridge application.
 * @module util
 */

const encoder = new TextEncoder();

/**
 * Sleep helper returning a promise that resolves after the provided milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a random identifier suitable for DOM keys.
 * @returns {string}
 */
export function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `lb-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Deep merge two objects while keeping reference safety.
 * @param {object} target
 * @param {object} source
 * @returns {object}
 */
export function deepMerge(target, source) {
  const output = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      output[key] = deepMerge(target[key] ?? {}, value);
    } else {
      output[key] = value;
    }
  }
  return output;
}

/**
 * Deep equality check using JSON stringification with stable keys.
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
export function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object" || a === null || b === null) return false;
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i += 1) {
    const key = aKeys[i];
    if (key !== bKeys[i]) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}

/**
 * Debounce execution of a function.
 * @template {(...args: any[]) => void} T
 * @param {T} fn
 * @param {number} delay
 * @returns {T}
 */
export function debounce(fn, delay = 200) {
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;
  return /** @type {T} */ (
    function debounced(...args) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    }
  );
}

/**
 * Lightweight throttle implementation.
 * @template {(...args: any[]) => void} T
 * @param {T} fn
 * @param {number} delay
 * @returns {T}
 */
export function throttle(fn, delay = 100) {
  /** @type {number} */
  let lastCall = 0;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let trailing;
  return /** @type {T} */ (
    function throttled(...args) {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        fn.apply(this, args);
      } else {
        if (trailing) clearTimeout(trailing);
        trailing = setTimeout(() => {
          lastCall = Date.now();
          fn.apply(this, args);
        }, delay - (now - lastCall));
      }
    }
  );
}

/**
 * Minimal event emitter used to coordinate UI components.
 * @returns {{on: (event: string, listener: Function) => () => void, emit: (event: string, payload?: any) => void}}
 */
export function createEventBus() {
  /** @type {Map<string, Set<Function>>} */
  const listeners = new Map();
  return {
    on(event, listener) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)?.add(listener);
      return () => listeners.get(event)?.delete(listener);
    },
    emit(event, payload) {
      listeners.get(event)?.forEach((listener) => listener(payload));
    },
  };
}

/**
 * Exponential backoff helper with jitter.
 * @param {(attempt: number) => Promise<any>} task
 * @param {{ maxAttempts?: number, baseDelay?: number, maxDelay?: number, onRetry?: (error: Error, attempt: number, delay: number) => void }} options
 * @returns {Promise<any>}
 */
export async function withBackoff(task, options = {}) {
  const {
    maxAttempts = 5,
    baseDelay = 1500,
    maxDelay = 60000,
    onRetry = () => {},
  } = options;
  let attempt = 0;
  while (true) {
    try {
      return await task(attempt);
    } catch (error) {
      attempt += 1;
      if (attempt >= maxAttempts) throw error;
      const jitter = Math.random() * 300;
      const delay = Math.min(maxDelay, baseDelay * 2 ** (attempt - 1)) + jitter;
      onRetry(/** @type {Error} */ (error), attempt, delay);
      await sleep(delay);
    }
  }
}

/**
 * Wrapper around fetch adding retry, cancellation and logging hooks.
 * @param {string} url
 * @param {RequestInit & { retry?: number, retryOn?: number[], signal?: AbortSignal }} options
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(url, options = {}) {
  const { retry = 3, retryOn = [429, 500, 502, 503, 504], signal, ...rest } = options;
  let attempts = 0;
  const controller = new AbortController();
  const combinedSignal = mergeSignals(signal, controller.signal);

  while (attempts <= retry) {
    attempts += 1;
    try {
      const response = await fetch(url, { ...rest, signal: combinedSignal });
      if (!response.ok && retryOn.includes(response.status) && attempts <= retry) {
        const wait = Math.min(60000, 1500 * 2 ** (attempts - 1));
        await sleep(wait + Math.random() * 400);
        continue;
      }
      return response;
    } catch (error) {
      if (error.name === "AbortError") throw error;
      if (attempts > retry) throw error;
      await sleep(Math.min(60000, 1500 * 2 ** (attempts - 1)) + Math.random() * 400);
    }
  }
  throw new Error("fetchWithRetry: exhausted attempts");
}

/**
 * Merge AbortSignals into a single signal.
 * @param {AbortSignal | undefined} signalA
 * @param {AbortSignal | undefined} signalB
 * @returns {AbortSignal | undefined}
 */
export function mergeSignals(signalA, signalB) {
  if (!signalA) return signalB;
  if (!signalB) return signalA;
  const controller = new AbortController();
  const abort = () => controller.abort();
  signalA.addEventListener("abort", abort);
  signalB.addEventListener("abort", abort);
  return controller.signal;
}

/**
 * In-memory least-recently-used cache.
 */
export class LRUCache {
  /**
   * @param {number} maxEntries
   */
  constructor(maxEntries = 100) {
    this.max = maxEntries;
    /** @type {Map<string, any>} */
    this.map = new Map();
  }

  /**
   * @param {string} key
   * @param {any} value
   */
  set(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.max) {
      const first = this.map.keys().next().value;
      this.map.delete(first);
    }
  }

  /**
   * @param {string} key
   * @returns {any}
   */
  get(key) {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  clear() {
    this.map.clear();
  }
}

/**
 * Format milliseconds into mm:ss string.
 * @param {number} ms
 * @returns {string}
 */
export function formatDuration(ms) {
  const seconds = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Trigger a file download in-browser.
 * @param {BlobPart[]} parts
 * @param {string} filename
 * @param {string} mime
 */
export function downloadFile(parts, filename, mime = "text/plain") {
  const blob = new Blob(parts, { type: mime });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

/**
 * Parse CSV text into objects.
 * @param {string} text
 * @returns {Record<string, string>[]}
 */
export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    /** @type {Record<string, string>} */
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? "";
    });
    return row;
  });
}

/**
 * Serialize array of objects into CSV text.
 * @param {Record<string, any>[]} rows
 * @returns {string}
 */
export function toCSV(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const headerLine = headers.join(",");
  const body = rows
    .map((row) => headers.map((key) => formatCSVValue(row[key])).join(","))
    .join("\n");
  return `${headerLine}\n${body}`;
}

function formatCSVValue(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function splitCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map((value) => value.trim());
}

/**
 * Download JSON data as a file.
 * @param {any} data
 * @param {string} filename
 */
export function downloadJSON(data, filename) {
  downloadFile([JSON.stringify(data, null, 2)], filename, "application/json");
}

/**
 * Convert string to ArrayBuffer.
 * @param {string} value
 * @returns {ArrayBuffer}
 */
export function stringToBuffer(value) {
  return encoder.encode(value).buffer;
}

/**
 * Safe JSON parse returning fallback on error.
 * @template T
 * @param {string | null} text
 * @param {T} fallback
 * @returns {T}
 */
export function safeJsonParse(text, fallback) {
  try {
    return text ? JSON.parse(text) : fallback;
  } catch (error) {
    console.warn("safeJsonParse: failed", error);
    return fallback;
  }
}

/**
 * Broadcast text to screen reader live region.
 * @param {string} message
 */
export function announce(message) {
  let region = document.querySelector("[data-sr-region]");
  if (!region) {
    const template = document.getElementById("sr-live-region");
    if (template instanceof HTMLTemplateElement) {
      region = template.content.firstElementChild?.cloneNode(true);
      if (region) {
        region.setAttribute("data-sr-region", "");
        document.body.appendChild(region);
      }
    }
  }
  if (region) {
    region.textContent = message;
  }
}

/**
 * Create a cancellable token.
 * @returns {{ signal: AbortSignal, cancel: () => void }}
 */
export function createAbortable() {
  const controller = new AbortController();
  return {
    signal: controller.signal,
    cancel: () => controller.abort(),
  };
}

/**
 * Get localized string from dictionary.
 * @param {Record<string, Record<string, string>>} dict
 * @param {string} key
 * @param {string} locale
 * @returns {string}
 */
export function t(dict, key, locale) {
  const entry = dict[locale] ?? dict.en;
  return entry[key] ?? key;
}
