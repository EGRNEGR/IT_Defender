// @ts-check

/**
 * @param {number} ttlMs
 * @param {Date | number} [from]
 * @returns {string}
 */
export function computeTtlExpiry(ttlMs, from = Date.now()) {
  const base = from instanceof Date ? from.getTime() : from;
  return new Date(base + ttlMs).toISOString();
}

/**
 * @param {string} ttlExpiresAt
 * @param {Date | number} [at]
 * @returns {boolean}
 */
export function isCacheFresh(ttlExpiresAt, at = Date.now()) {
  const base = at instanceof Date ? at.getTime() : at;
  return new Date(ttlExpiresAt).getTime() > base;
}
