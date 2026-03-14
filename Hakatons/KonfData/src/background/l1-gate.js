// @ts-check

import { verdicts } from "../shared/types.js";
import { buildL1Request, extractDomain } from "../shared/url-utils.js";
import { getSettings } from "./settings.js";
import { ensurePhishingDatabaseFeeds } from "./feed-manager.js";
import * as localBlacklist from "./checkers/local-blacklist.js";
import * as virustotal from "./checkers/virustotal.js";
import * as phishtank from "./checkers/phishtank.js";
import * as openphish from "./checkers/openphish.js";
import * as abuseipdb from "./checkers/abuseipdb.js";
import { getCachedResult, saveCachedResult } from "./cache.js";
import { resolveIps } from "./dns.js";
import { aggregateVerdict } from "./aggregate.js";

/**
 * @param {{ sourceContext: import("../shared/types.js").SourceContext; urls?: string[]; domains?: string[]; ips?: string[]; resolveIps?: boolean }} input
 * @returns {Promise<import("../shared/types.js").L1Result>}
 */
export async function runL1Check(input) {
  const settings = await getSettings();
  const request = buildL1Request(input);

  if (input.resolveIps !== false && request.ips.length === 0 && request.urls.length > 0) {
    const domain = extractDomain(request.urls[0]);
    const ips = await resolveIps(domain, settings.threatIntel.dohResolverUrl);
    request.ips = [...new Set([...request.ips, ...ips])];
  }

  if (!request.urls.length && !request.domains.length && !request.ips.length) {
    return { verdict: verdicts.PROCEED, results: [], checkedAt: new Date().toISOString(), request };
  }

  await ensurePhishingDatabaseFeeds(settings.threatIntel.phishingDatabaseSyncHours);
  const localFeedTtlMs = settings.threatIntel.phishingDatabaseSyncHours * 60 * 60 * 1000;

  const tasks = [];

  for (const url of request.urls) {
    tasks.push(
      executeChecker("local_blacklist", "url", url, localFeedTtlMs, () =>
        localBlacklist.checkUrl(url, settings.threatIntel.phishingDatabaseSyncHours)
      )
    );
    tasks.push(
      executeChecker("virustotal", "url", url, settings.threatIntel.providers.virustotal.cacheTtlMs, () =>
        virustotal.check("url", url, settings.threatIntel.providers.virustotal)
      )
    );
    tasks.push(
      executeChecker("phishtank", "url", url, settings.threatIntel.providers.phishtank.cacheTtlMs, () =>
        phishtank.check(url, settings.threatIntel.providers.phishtank)
      )
    );
    tasks.push(
      executeChecker("openphish", "url", url, settings.threatIntel.providers.openphish.cacheTtlMs, () =>
        openphish.check(url, settings.threatIntel.providers.openphish)
      )
    );
  }

  for (const domain of request.domains) {
    tasks.push(
      executeChecker("local_blacklist", "domain", domain, localFeedTtlMs, () =>
        localBlacklist.checkDomain(
          domain,
          settings.threatIntel.suspiciousTlds,
          settings.threatIntel.suspiciousTldBlocks,
          settings.threatIntel.phishingDatabaseSyncHours
        )
      )
    );
    tasks.push(
      executeChecker("virustotal", "domain", domain, settings.threatIntel.providers.virustotal.cacheTtlMs, () =>
        virustotal.check("domain", domain, settings.threatIntel.providers.virustotal)
      )
    );
  }

  for (const ip of request.ips) {
    tasks.push(
      executeChecker("local_blacklist", "ip", ip, localFeedTtlMs, () =>
        localBlacklist.checkIp(ip, settings.threatIntel.phishingDatabaseSyncHours)
      )
    );
    tasks.push(
      executeChecker("abuseipdb", "ip", ip, settings.threatIntel.providers.abuseipdb.cacheTtlMs, () =>
        abuseipdb.check(ip, settings.threatIntel.providers.abuseipdb)
      )
    );
  }

  const results = await Promise.all(tasks);
  const verdict = aggregateVerdict(results);
  return { verdict, results, checkedAt: new Date().toISOString(), request };
}

/**
 * @param {string} source
 * @param {"url"|"domain"|"ip"} kind
 * @param {string} target
 * @param {number} ttlMs
 * @param {() => Promise<import("../shared/types.js").CheckerResult>} runner
 */
async function executeChecker(source, kind, target, ttlMs, runner) {
  const cached = await getCachedResult(source, kind, target);
  if (cached) {
    return cached;
  }

  const result = await runner();
  await saveCachedResult(source, kind, target, result, ttlMs);
  return result;
}
