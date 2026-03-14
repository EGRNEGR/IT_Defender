// @ts-check

import { normalizeIp } from "../shared/url-utils.js";
import { logWarn } from "./logging.js";

/**
 * @param {string} domain
 * @param {string} resolverUrl
 */
export async function resolveIps(domain, resolverUrl) {
  if (!domain || !resolverUrl) {
    return [];
  }

  try {
    const response = await fetch(`${resolverUrl}?name=${encodeURIComponent(domain)}&type=A`, {
      headers: { accept: "application/dns-json" }
    });
    if (!response.ok) {
      return [];
    }
    const payload = await response.json();
    const answers = Array.isArray(payload.Answer) ? payload.Answer : [];
    return [...new Set(answers.map((entry) => normalizeIp(entry.data)).filter(Boolean))];
  } catch (error) {
    logWarn("dns_resolution_failed", { domain, error: String(error) });
    return [];
  }
}
