// @ts-check

/**
 * @param {string} value
 * @returns {string}
 */
export function canonicalizeHostname(value) {
  const trimmed = `${value || ""}`.trim().toLowerCase().replace(/\.$/, "");
  return trimmed.startsWith("www.") ? trimmed.slice(4) : trimmed;
}

/**
 * @param {string} raw
 * @returns {string}
 */
export function normalizeUrl(raw) {
  if (!raw || typeof raw !== "string") {
    return "";
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }

  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    url.hash = "";
    url.hostname = canonicalizeHostname(url.hostname);
    if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) {
      url.port = "";
    }

    const normalizedPath = url.pathname.replace(/\/{2,}/g, "/");
    url.pathname = normalizedPath || "/";
    const normalized = url.toString();
    return normalized.endsWith("/") && url.pathname === "/" && !url.search ? normalized.slice(0, -1) : normalized;
  } catch {
    return trimmed;
  }
}

/**
 * @param {string} raw
 * @returns {string}
 */
export function extractDomain(raw) {
  if (!raw || typeof raw !== "string") {
    return "";
  }

  try {
    const normalized = normalizeUrl(raw);
    const url = new URL(normalized.includes("://") ? normalized : `https://${normalized}`);
    return canonicalizeHostname(url.hostname);
  } catch {
    return canonicalizeHostname(raw.split("/")[0] || raw);
  }
}

/**
 * @param {string} value
 * @returns {boolean}
 */
export function isIpAddress(value) {
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value.trim()) || /^\[?[a-f0-9:]+\]?$/i.test(value.trim());
}

/**
 * @param {string} value
 * @returns {string}
 */
export function normalizeIp(value) {
  return `${value || ""}`.trim().replace(/^\[|\]$/g, "").toLowerCase();
}

/**
 * @param {{ urls?: string[]; domains?: string[]; ips?: string[] }} input
 * @returns {import("./types.js").L1CheckRequest}
 */
export function buildL1Request(input) {
  const urls = [...new Set((input.urls || []).map(normalizeUrl).filter(Boolean))];
  const domains = [...new Set((input.domains || []).map(extractDomain).filter(Boolean))];
  const ips = [...new Set((input.ips || []).map(normalizeIp).filter(Boolean))];
  return { urls, domains, ips };
}

/**
 * @param {string} tld
 * @param {string[]} suspiciousTlds
 * @returns {boolean}
 */
export function isSuspiciousTld(tld, suspiciousTlds) {
  const normalized = `.${tld.replace(/^\./, "").toLowerCase()}`;
  return suspiciousTlds.includes(normalized);
}

/**
 * @param {string} domain
 * @returns {string}
 */
export function extractTld(domain) {
  const host = extractDomain(domain);
  const parts = host.split(".");
  return parts.length > 1 ? parts.at(-1) || "" : "";
}
