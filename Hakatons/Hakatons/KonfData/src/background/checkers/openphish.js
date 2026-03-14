// @ts-check

import { cacheSources } from "../constants.js";
import { ensureOpenPhishFeed } from "../feed-manager.js";
import { normalizeUrl } from "../../shared/url-utils.js";

/**
 * @param {string} url
 * @param {import("../../shared/types.js").ProviderConfig} config
 */
export async function check(url, config) {
  if (!config.enabled) {
    return { source: cacheSources.OPENPHISH, is_malicious: false, detail: "Disabled", target: url, kind: "url", status: "unavailable" };
  }

  const feed = await ensureOpenPhishFeed(config.timeoutMs);
  if (!feed) {
    return { source: cacheSources.OPENPHISH, is_malicious: false, detail: "OpenPhish feed unavailable", target: url, kind: "url", status: "unavailable" };
  }

  const normalized = normalizeUrl(url);
  const hit = new Set(feed.items).has(normalized);
  return {
    source: cacheSources.OPENPHISH,
    is_malicious: hit,
    detail: hit ? "Found in OpenPhish feed" : "Not found in OpenPhish feed",
    target: normalized,
    kind: "url",
    status: "ok"
  };
}
