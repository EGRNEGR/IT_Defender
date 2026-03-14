// @ts-check

import { getRecord, putRecord } from "./db.js";
import { extractDomain, normalizeUrl } from "../shared/url-utils.js";

/**
 * @param {string} normalizedUrl
 */
function linkIdFromUrl(normalizedUrl) {
  return normalizeUrl(normalizedUrl);
}

/**
 * @param {{
 *   url: string;
 *   sourceContext: import("../shared/types.js").SourceContext;
 *   ips: string[];
 *   verdict: import("../shared/types.js").Verdict;
 *   reasons: string[];
 *   sources: string[];
 *   eventId: string;
 * }} input
 */
export async function upsertLinkRecord(input) {
  const normalizedUrl = normalizeUrl(input.url);
  const domain = extractDomain(normalizedUrl);
  const id = linkIdFromUrl(normalizedUrl);
  const now = new Date().toISOString();
  const existing = await getRecord("links", id);
  const record = existing || {
    id,
    url: input.url,
    normalizedUrl,
    domain,
    ips: [],
    firstSeenAt: now,
    lastSeenAt: now,
    sourceContext: input.sourceContext,
    verdictHistory: [],
    userOverride: null,
    tags: []
  };

  record.url = input.url;
  record.normalizedUrl = normalizedUrl;
  record.domain = domain;
  record.ips = [...new Set([...(record.ips || []), ...(input.ips || [])])];
  record.lastSeenAt = now;
  record.sourceContext = input.sourceContext;
  record.verdictHistory = [
    ...(record.verdictHistory || []),
    {
      verdict: input.verdict,
      timestamp: now,
      reasons: input.reasons,
      sources: input.sources,
      eventId: input.eventId
    }
  ].slice(-25);

  await putRecord("links", record);
  return record;
}

/**
 * @param {string} linkId
 * @param {string} eventId
 * @param {string} reason
 */
export async function recordOverride(linkId, eventId, reason) {
  const record = await getRecord("links", linkId);
  if (!record) {
    return null;
  }

  record.userOverride = {
    action: "continue",
    reason,
    actor: "user",
    timestamp: new Date().toISOString(),
    eventId
  };

  await putRecord("links", record);
  return record;
}
