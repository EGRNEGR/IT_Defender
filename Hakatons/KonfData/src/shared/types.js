// @ts-check

/**
 * @typedef {"REJECT"|"PROCEED"} Verdict
 */

/**
 * @typedef {"navigation"|"link_click"|"paste"|"manual_scan"|"qr_decode"|"unknown"} SourceContext
 */

/**
 * @typedef {{
 *   urls: string[];
 *   domains: string[];
 *   ips: string[];
 * }} L1CheckRequest
 */

/**
 * @typedef {{
 *   source: string;
 *   is_malicious: boolean;
 *   detail: string;
 *   target?: string;
 *   kind?: "url"|"domain"|"ip"|"signal";
 *   checkedAt?: string;
 *   fromCache?: boolean;
 *   status?: "ok"|"unavailable"|"error"|"rate_limited";
 * }} CheckerResult
 */

/**
 * @typedef {{
 *   verdict: Verdict;
 *   results: CheckerResult[];
 *   checkedAt: string;
 *   request: L1CheckRequest;
 * }} L1Result
 */

/**
 * @typedef {{
 *   id: string;
 *   url: string;
 *   normalizedUrl: string;
 *   domain: string;
 *   ips: string[];
 *   firstSeenAt: string;
 *   lastSeenAt: string;
 *   sourceContext: SourceContext;
 *   verdictHistory: Array<{
 *     verdict: Verdict;
 *     timestamp: string;
 *     reasons: string[];
 *     sources: string[];
 *     eventId: string;
 *   }>;
 *   userOverride: null | {
 *     action: "continue";
 *     reason: string;
 *     actor: "user";
 *     timestamp: string;
 *     eventId: string;
 *   };
 *   tags: string[];
 * }} LinkRecord
 */

/**
 * @typedef {{
 *   key: string;
 *   source: string;
 *   kind: "url"|"domain"|"ip";
 *   result: CheckerResult;
 *   checkedAt: string;
 *   ttlExpiresAt: string;
 * }} CheckerCacheEntry
 */

/**
 * @typedef {{
 *   eventId: string;
 *   linkId: string;
 *   verdict: Verdict;
 *   reasons: string[];
 *   sources: string[];
 *   timestamp: string;
 *   overrideApplied?: boolean;
 * }} DecisionRecord
 */

/**
 * @typedef {{
 *   enabled: boolean;
 *   useProxy: boolean;
 *   proxyBaseUrl: string;
 *   apiKey: string;
 *   timeoutMs: number;
 *   cacheTtlMs: number;
 * }} ProviderConfig
 */

/**
 * @typedef {{
 *   threatIntel: {
 *     enabled: boolean;
 *     blockOnMalicious: boolean;
 *     allowOverride: boolean;
 *     overrideRequireReason: boolean;
 *     suspiciousTlds: string[];
 *     suspiciousTldBlocks: boolean;
 *     phishingDatabaseSyncHours: number;
 *     dohResolverUrl: string;
 *     providers: {
 *       virustotal: ProviderConfig;
 *       phishtank: ProviderConfig;
 *       openphish: ProviderConfig;
 *       abuseipdb: ProviderConfig;
 *     };
 *   };
 * }} ExtensionSettings
 */

export const verdicts = Object.freeze({
  REJECT: "REJECT",
  PROCEED: "PROCEED"
});
