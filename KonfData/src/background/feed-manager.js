// @ts-check

import { feedConfig } from "./constants.js";
import { getRecord, putRecord } from "./db.js";
import { normalizeUrl, extractDomain, normalizeIp } from "../shared/url-utils.js";
import { fetchWithPolicy, CircuitBreaker } from "./network.js";
import { logWarn } from "./logging.js";

const feedBreaker = new CircuitBreaker(2, 5 * 60_000);

/**
 * @param {string} id
 * @param {number} maxAgeMs
 */
export async function getFeed(id, maxAgeMs) {
  const record = await getRecord("feeds", id);
  if (!record) {
    return null;
  }

  if (Date.now() - new Date(record.checkedAt).getTime() > maxAgeMs) {
    return null;
  }

  return record;
}

/**
 * @param {string} id
 * @param {string} url
 * @param {(line: string) => string} normalizer
 * @param {number} timeoutMs
 */
export async function refreshTextFeed(id, url, normalizer, timeoutMs = 15_000) {
  const response = await fetchWithPolicy(url, {}, { timeoutMs, retries: 1, breaker: feedBreaker });
  const text = await response.text();
  const items = text
    .split(/\r?\n/)
    .map((line) => normalizer(line.trim()))
    .filter(Boolean);
  const record = {
    id,
    checkedAt: new Date().toISOString(),
    items: [...new Set(items)]
  };
  await putRecord("feeds", record);
  return record;
}

export async function ensurePhishingDatabaseFeeds(syncHours) {
  const maxAgeMs = syncHours * 60 * 60 * 1000;
  const targets = [
    ["phishingdb_urls", feedConfig.phishingDatabase.urls, normalizeUrl],
    ["phishingdb_domains", feedConfig.phishingDatabase.domains, extractDomain],
    ["phishingdb_ips", feedConfig.phishingDatabase.ips, normalizeIp]
  ];

  for (const [id, url, normalizer] of targets) {
    const existing = await getFeed(id, maxAgeMs);
    if (existing) {
      continue;
    }
    try {
      await refreshTextFeed(id, url, normalizer);
    } catch (error) {
      logWarn("feed_refresh_failed", { id, url, error: String(error) });
    }
  }
}

export async function ensureOpenPhishFeed(timeoutMs) {
  const existing = await getFeed("openphish_urls", 60 * 60 * 1000);
  if (existing) {
    return existing;
  }

  try {
    return await refreshTextFeed("openphish_urls", feedConfig.openphish.urls, normalizeUrl, timeoutMs);
  } catch (error) {
    logWarn("openphish_refresh_failed", { error: String(error) });
    return null;
  }
}
