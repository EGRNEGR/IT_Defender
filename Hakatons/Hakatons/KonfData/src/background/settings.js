// @ts-check

import { defaultSettings } from "./constants.js";

/**
 * @template T
 * @param {T} value
 * @returns {T}
 */
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * @param {object} target
 * @param {object} source
 * @returns {object}
 */
function mergeDeep(target, source) {
  const next = clone(target);
  for (const [key, value] of Object.entries(source || {})) {
    if (value && typeof value === "object" && !Array.isArray(value) && next[key] && typeof next[key] === "object") {
      next[key] = mergeDeep(next[key], value);
      continue;
    }
    next[key] = value;
  }
  return next;
}

export async function getSettings() {
  const stored = await chrome.storage.sync.get("aiPrivacySettings");
  return /** @type {import("../shared/types.js").ExtensionSettings} */ (
    mergeDeep(defaultSettings, stored.aiPrivacySettings || {})
  );
}

/**
 * @param {import("../shared/types.js").ExtensionSettings} next
 */
export async function saveSettings(next) {
  await chrome.storage.sync.set({ aiPrivacySettings: next });
}
