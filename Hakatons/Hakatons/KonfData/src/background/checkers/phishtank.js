// @ts-check

import { cacheSources } from "../constants.js";
import { CircuitBreaker, RateLimiter, dedupeInflight, fetchWithPolicy } from "../network.js";

const breaker = new CircuitBreaker();
const limiter = new RateLimiter(2);

/**
 * @param {string} url
 * @param {import("../../shared/types.js").ProviderConfig} config
 */
export async function check(url, config) {
  if (!config.enabled) {
    return { source: cacheSources.PHISHTANK, is_malicious: false, detail: "Disabled", target: url, kind: "url", status: "unavailable" };
  }
  if (!config.proxyBaseUrl) {
    return {
      source: cacheSources.PHISHTANK,
      is_malicious: false,
      detail: "Configure a proxy endpoint for PhishTank to avoid exposing credentials client-side",
      target: url,
      kind: "url",
      status: "unavailable"
    };
  }

  const requestUrl = `${config.proxyBaseUrl.replace(/\/$/, "")}/phishtank/check`;

  return dedupeInflight(`phishtank:url:${url}`, async () =>
    limiter.run(async () => {
      try {
        const response = await fetchWithPolicy(
          requestUrl,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ url })
          },
          { timeoutMs: config.timeoutMs, retries: 1, breaker }
        );
        const payload = await response.json();
        const malicious = Boolean(payload?.results?.in_database && payload?.results?.valid);
        return {
          source: cacheSources.PHISHTANK,
          is_malicious: malicious,
          detail: malicious ? "Reported as valid phish by PhishTank" : "No valid PhishTank match",
          target: url,
          kind: "url",
          status: "ok"
        };
      } catch (error) {
        return {
          source: cacheSources.PHISHTANK,
          is_malicious: false,
          detail: String(error) === "Error: circuit_open" ? "Temporarily unavailable (circuit open)" : `Unavailable: ${String(error)}`,
          target: url,
          kind: "url",
          status: "unavailable"
        };
      }
    })
  );
}
