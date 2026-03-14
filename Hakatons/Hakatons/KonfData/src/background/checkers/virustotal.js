// @ts-check

import { cacheSources } from "../constants.js";
import { CircuitBreaker, RateLimiter, dedupeInflight, fetchWithPolicy } from "../network.js";

const breaker = new CircuitBreaker();
const limiter = new RateLimiter(2);

function encodeUrlId(url) {
  return btoa(url).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/**
 * @param {"url"|"domain"} kind
 * @param {string} target
 * @param {import("../../shared/types.js").ProviderConfig} config
 */
export async function check(kind, target, config) {
  if (!config.enabled) {
    return { source: cacheSources.VIRUSTOTAL, is_malicious: false, detail: "Disabled", target, kind, status: "unavailable" };
  }
  if (!config.apiKey && !config.useProxy) {
    return { source: cacheSources.VIRUSTOTAL, is_malicious: false, detail: "API key not configured", target, kind, status: "unavailable" };
  }

  const requestUrl = config.useProxy
    ? `${config.proxyBaseUrl.replace(/\/$/, "")}/virustotal/${kind}/${encodeURIComponent(target)}`
    : `https://www.virustotal.com/api/v3/${kind === "url" ? `urls/${encodeUrlId(target)}` : `domains/${encodeURIComponent(target)}`}`;

  const headers = config.useProxy ? {} : { "x-apikey": config.apiKey };

  return dedupeInflight(`virustotal:${kind}:${target}`, async () =>
    limiter.run(async () => {
      try {
        const response = await fetchWithPolicy(requestUrl, { headers }, { timeoutMs: config.timeoutMs, retries: 1, breaker });
        if (response.status === 404) {
          return { source: cacheSources.VIRUSTOTAL, is_malicious: false, detail: "Not found in VirusTotal", target, kind, status: "ok" };
        }
        const payload = await response.json();
        const stats = payload?.data?.attributes?.last_analysis_stats || {};
        const malicious = Number(stats.malicious || 0);
        const suspicious = Number(stats.suspicious || 0);
        return {
          source: cacheSources.VIRUSTOTAL,
          is_malicious: malicious + suspicious > 0,
          detail: `malicious=${malicious}, suspicious=${suspicious}`,
          target,
          kind,
          status: "ok"
        };
      } catch (error) {
        return {
          source: cacheSources.VIRUSTOTAL,
          is_malicious: false,
          detail: String(error) === "Error: circuit_open" ? "Temporarily unavailable (circuit open)" : `Unavailable: ${String(error)}`,
          target,
          kind,
          status: "unavailable"
        };
      }
    })
  );
}
