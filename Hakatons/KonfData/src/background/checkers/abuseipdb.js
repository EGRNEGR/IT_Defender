// @ts-check

import { cacheSources } from "../constants.js";
import { CircuitBreaker, RateLimiter, dedupeInflight, fetchWithPolicy } from "../network.js";

const breaker = new CircuitBreaker();
const limiter = new RateLimiter(2);

/**
 * @param {string} ip
 * @param {import("../../shared/types.js").ProviderConfig} config
 */
export async function check(ip, config) {
  if (!config.enabled) {
    return { source: cacheSources.ABUSEIPDB, is_malicious: false, detail: "Disabled", target: ip, kind: "ip", status: "unavailable" };
  }
  if (!config.apiKey && !config.useProxy) {
    return { source: cacheSources.ABUSEIPDB, is_malicious: false, detail: "API key not configured", target: ip, kind: "ip", status: "unavailable" };
  }

  const requestUrl = config.useProxy
    ? `${config.proxyBaseUrl.replace(/\/$/, "")}/abuseipdb/check?ip=${encodeURIComponent(ip)}`
    : `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90`;
  const headers = config.useProxy ? {} : { Key: config.apiKey, Accept: "application/json" };

  return dedupeInflight(`abuseipdb:ip:${ip}`, async () =>
    limiter.run(async () => {
      try {
        const response = await fetchWithPolicy(requestUrl, { headers }, { timeoutMs: config.timeoutMs, retries: 1, breaker });
        const payload = await response.json();
        const score = Number(payload?.data?.abuseConfidenceScore || 0);
        const reports = Number(payload?.data?.totalReports || 0);
        return {
          source: cacheSources.ABUSEIPDB,
          is_malicious: score >= 50,
          detail: `abuse_score=${score}, reports=${reports}`,
          target: ip,
          kind: "ip",
          status: "ok"
        };
      } catch (error) {
        return {
          source: cacheSources.ABUSEIPDB,
          is_malicious: false,
          detail: String(error) === "Error: circuit_open" ? "Temporarily unavailable (circuit open)" : `Unavailable: ${String(error)}`,
          target: ip,
          kind: "ip",
          status: "unavailable"
        };
      }
    })
  );
}
