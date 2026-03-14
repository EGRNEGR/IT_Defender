# AI-Privacy Sentinel

`AI-Privacy Sentinel` is a Manifest V3 browser extension that now combines two defensive controls:

- in-page privacy protection for sensitive text before it is submitted
- an `L1 Threat Intel` gate that checks URLs, domains, and resolved IPs against local and external phishing-reputation sources

The implementation is defensive only. It does not collect credentials, perform traffic interception, or automate phishing activity.

## Architecture

```text
+--------------------------- Browser Extension ----------------------------+
|                                                                         |
|  Content scripts                                                        |
|  - detector.js / content.js: sensitive-text detection and masking       |
|  - src/content/link-guard.js: link click + paste intake                 |
|            |                                                            |
|            v                                                            |
|  Background service worker (src/background/service-worker.js)           |
|  - request intake                                                       |
|  - L1 orchestration                                                     |
|  - cache / metrics / audit logging                                      |
|  - warning context handoff                                              |
|            |                                                            |
|            v                                                            |
|  L1 Gate (src/background/l1-gate.js)                                    |
|  - normalize URL/domain/IP                                              |
|  - optional DoH IP resolution                                           |
|  - local blacklist from Phishing.Database                               |
|  - VirusTotal / PhishTank / OpenPhish / AbuseIPDB wrappers              |
|  - ANY malicious => REJECT                                              |
|            |                                                            |
|            v                                                            |
|  IndexedDB                                                              |
|  - links                                                                |
|  - checkerCache                                                         |
|  - decisions                                                            |
|  - feeds                                                                |
|  - metrics                                                              |
|                                                                         |
|  UI                                                                     |
|  - popup.html: current-tab L1 summary                                   |
|  - options.html: provider config and policy                             |
|  - warning.html: interstitial with explainability + override            |
+-------------------------------------------------------------------------+
```

## Key modules

- `src/background/service-worker.js`
  Handles navigation events, content-script messages, warning-page state, and auditable overrides.
- `src/background/l1-gate.js`
  Executes local and external checkers in parallel and returns `REJECT` if any source flags malicious.
- `src/background/checkers/*`
  Checker wrappers with rate limits, timeout handling, dedupe, and graceful degradation.
- `src/background/feed-manager.js`
  Syncs `Phishing.Database` feeds and the OpenPhish URL feed into local storage.
- `src/background/db.js`
  IndexedDB schema for link records, cache entries, decisions, feeds, and metrics.
- `src/shared/*`
  Pure logic for URL/domain/IP normalization, suffix matching, cache TTL checks, and verdict aggregation.
- `tests/*`
  Pure-logic browser test runner covering extraction, suffix matching, aggregation, and TTL behavior.

## IndexedDB schema

- `links`
  `id`, `url`, `normalizedUrl`, `domain`, `ips`, `firstSeenAt`, `lastSeenAt`, `sourceContext`, `verdictHistory`, `userOverride`, `tags`
- `checkerCache`
  `key`, `source`, `kind`, `result`, `checkedAt`, `ttlExpiresAt`
- `decisions`
  `eventId`, `linkId`, `verdict`, `reasons`, `sources`, `timestamp`, `overrideApplied`
- `feeds`
  cached phishing feeds and last refresh timestamps
- `metrics`
  blocked / allowed / overridden counters

## Provider configuration

Provider settings live in the options page under `Threat-intel policy` and `Provider settings`.

### Important

- `VirusTotal` and `AbuseIPDB` can run directly with client-side API keys, but those keys are exposed to anyone with local extension access.
- `PhishTank` is intentionally proxy-first in this implementation. Use a server-side proxy to avoid placing sensitive credentials in the extension.
- If a provider is unavailable, timed out, or circuit-broken, the result is recorded as unavailable and does not trigger a malicious verdict.

## Local blacklist source

The extension syncs the following feeds from `Phishing.Database`:

- `phishing-links-ACTIVE.txt`
- `phishing-domains-ACTIVE.txt`
- `phishing-IPs-ACTIVE.txt`

These feeds back the local blacklist logic for exact URL, exact domain, suffix-domain, and exact IP checks.

## Threat model and security notes

- The extension only sends normalized URL, domain, and resolved IP values to reputation providers. It does not send full page content.
- Client-side API keys are a local secret-exposure risk. Prefer a proxy for every paid or rate-limited provider.
- The warning page stores only the minimum decision context in `chrome.storage.session`.
- Overrides are audited in IndexedDB and can require a reason.
- Suspicious TLDs are treated as a risk signal by default and are non-blocking unless the administrator explicitly enables blocking.

## Tests

Open [`tests/index.html`](/Users/dk/Documents/Hakatons/KonfData/tests/index.html) in a Chromium browser to run the pure logic tests:

- domain extraction
- suffix matching
- ANY-malicious aggregation
- cache TTL behavior

No Node.js test runner is included because `node`/`npm` were not available in this environment.
