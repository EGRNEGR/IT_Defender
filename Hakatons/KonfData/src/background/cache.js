// @ts-check

import { getRecord, putRecord, deleteRecord, getAllRecords } from "./db.js";
import { computeTtlExpiry, isCacheFresh } from "../shared/ttl-cache.js";

/**
 * @param {string} source
 * @param {"url"|"domain"|"ip"} kind
 * @param {string} target
 */
export function buildCacheKey(source, kind, target) {
  return `${source}:${kind}:${target}`;
}

/**
 * @param {string} source
 * @param {"url"|"domain"|"ip"} kind
 * @param {string} target
 */
export async function getCachedResult(source, kind, target) {
  const key = buildCacheKey(source, kind, target);
  const record = await getRecord("checkerCache", key);
  if (!record) {
    return null;
  }
  if (!isCacheFresh(record.ttlExpiresAt)) {
    await deleteRecord("checkerCache", key);
    return null;
  }
  return {
    ...record.result,
    fromCache: true,
    checkedAt: record.checkedAt
  };
}

/**
 * @param {string} source
 * @param {"url"|"domain"|"ip"} kind
 * @param {string} target
 * @param {import("../shared/types.js").CheckerResult} result
 * @param {number} ttlMs
 */
export async function saveCachedResult(source, kind, target, result, ttlMs) {
  const checkedAt = new Date().toISOString();
  return putRecord("checkerCache", {
    key: buildCacheKey(source, kind, target),
    source,
    kind,
    result: { ...result, checkedAt },
    checkedAt,
    ttlExpiresAt: computeTtlExpiry(ttlMs)
  });
}

export async function purgeExpiredCache() {
  const all = await getAllRecords("checkerCache");
  await Promise.all(
    all
      .filter((entry) => !isCacheFresh(entry.ttlExpiresAt))
      .map((entry) => deleteRecord("checkerCache", entry.key))
  );
}
