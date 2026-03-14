// @ts-check

import { cacheSources } from "../constants.js";
import { getFeed } from "../feed-manager.js";
import { extractDomain, normalizeIp, normalizeUrl, extractTld, isSuspiciousTld } from "../../shared/url-utils.js";
import { findSuffixMatch } from "../../shared/matchers.js";

/**
 * @param {string} url
 * @param {number} syncHours
 */
export async function checkUrl(url, syncHours) {
  const normalizedUrl = normalizeUrl(url);
  const feed = await getFeed("phishingdb_urls", syncHours * 60 * 60 * 1000);
  const items = new Set(feed?.items || []);
  const hit = items.has(normalizedUrl);
  return {
    source: cacheSources.LOCAL_BLACKLIST,
    is_malicious: hit,
    detail: hit ? "Found in Phishing.Database URL feed" : "URL not found in Phishing.Database URL feed",
    target: normalizedUrl,
    kind: "url",
    status: "ok"
  };
}

/**
 * @param {string} domain
 * @param {string[]} suspiciousTlds
 * @param {boolean} suspiciousTldBlocks
 * @param {number} syncHours
 */
export async function checkDomain(domain, suspiciousTlds, suspiciousTldBlocks, syncHours) {
  const normalizedDomain = extractDomain(domain);
  const feed = await getFeed("phishingdb_domains", syncHours * 60 * 60 * 1000);
  const blocked = new Set(feed?.items || []);
  const suffix = findSuffixMatch(normalizedDomain, blocked);

  if (suffix) {
    return {
      source: cacheSources.LOCAL_BLACKLIST,
      is_malicious: true,
      detail: suffix === normalizedDomain ? "Found in Phishing.Database domain feed" : `Subdomain of blocked domain ${suffix}`,
      target: normalizedDomain,
      kind: "domain",
      status: "ok"
    };
  }

  const tld = extractTld(normalizedDomain);
  if (tld && isSuspiciousTld(tld, suspiciousTlds)) {
    return {
      source: cacheSources.SUSPICIOUS_TLD,
      is_malicious: suspiciousTldBlocks,
      detail: suspiciousTldBlocks
        ? `Suspicious TLD .${tld} is configured as blocking`
        : `Suspicious TLD .${tld} noted as risk signal only`,
      target: normalizedDomain,
      kind: "signal",
      status: "ok"
    };
  }

  return {
    source: cacheSources.LOCAL_BLACKLIST,
    is_malicious: false,
    detail: "Domain not found in Phishing.Database domain feed",
    target: normalizedDomain,
    kind: "domain",
    status: "ok"
  };
}

/**
 * @param {string} ip
 * @param {number} syncHours
 */
export async function checkIp(ip, syncHours) {
  const normalizedIp = normalizeIp(ip);
  const feed = await getFeed("phishingdb_ips", syncHours * 60 * 60 * 1000);
  const items = new Set(feed?.items || []);
  const hit = items.has(normalizedIp);
  return {
    source: cacheSources.LOCAL_BLACKLIST,
    is_malicious: hit,
    detail: hit ? "Found in Phishing.Database IP feed" : "IP not found in Phishing.Database IP feed",
    target: normalizedIp,
    kind: "ip",
    status: "ok"
  };
}
