// @ts-check

import { canonicalizeHostname } from "./url-utils.js";

/**
 * @param {string} candidate
 * @param {Set<string>} blocked
 * @returns {boolean}
 */
export function matchesExactDomain(candidate, blocked) {
  const normalized = canonicalizeHostname(candidate);
  return blocked.has(normalized);
}

/**
 * @param {string} candidate
 * @param {Set<string>} blocked
 * @returns {string}
 */
export function findSuffixMatch(candidate, blocked) {
  const normalized = canonicalizeHostname(candidate);
  if (!normalized) {
    return "";
  }

  if (blocked.has(normalized)) {
    return normalized;
  }

  const parts = normalized.split(".");
  for (let index = 1; index < parts.length - 1; index += 1) {
    const suffix = parts.slice(index).join(".");
    if (blocked.has(suffix)) {
      return suffix;
    }
  }

  return "";
}
