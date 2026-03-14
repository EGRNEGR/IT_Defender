// @ts-check

/** @type {import("../shared/types.js").ExtensionSettings} */
export const defaultSettings = {
  threatIntel: {
    enabled: true,
    blockOnMalicious: true,
    allowOverride: true,
    overrideRequireReason: true,
    suspiciousTlds: [".tk", ".xyz", ".top", ".buzz", ".gq", ".ml", ".cf", ".ga", ".work", ".click"],
    suspiciousTldBlocks: false,
    phishingDatabaseSyncHours: 12,
    dohResolverUrl: "https://cloudflare-dns.com/dns-query",
    providers: {
      virustotal: {
        enabled: true,
        useProxy: false,
        proxyBaseUrl: "",
        apiKey: "",
        timeoutMs: 8000,
        cacheTtlMs: 6 * 60 * 60 * 1000
      },
      phishtank: {
        enabled: true,
        useProxy: true,
        proxyBaseUrl: "",
        apiKey: "",
        timeoutMs: 8000,
        cacheTtlMs: 6 * 60 * 60 * 1000
      },
      openphish: {
        enabled: true,
        useProxy: false,
        proxyBaseUrl: "",
        apiKey: "",
        timeoutMs: 8000,
        cacheTtlMs: 60 * 60 * 1000
      },
      abuseipdb: {
        enabled: true,
        useProxy: false,
        proxyBaseUrl: "",
        apiKey: "",
        timeoutMs: 8000,
        cacheTtlMs: 6 * 60 * 60 * 1000
      }
    }
  }
};

export const cacheSources = Object.freeze({
  LOCAL_BLACKLIST: "local_blacklist",
  VIRUSTOTAL: "virustotal",
  PHISHTANK: "phishtank",
  OPENPHISH: "openphish",
  ABUSEIPDB: "abuseipdb",
  SUSPICIOUS_TLD: "suspicious_tld"
});

export const feedConfig = Object.freeze({
  phishingDatabase: {
    urls: "https://raw.githubusercontent.com/Phishing-Database/Phishing.Database/master/phishing-links-ACTIVE.txt",
    domains: "https://raw.githubusercontent.com/Phishing-Database/Phishing.Database/master/phishing-domains-ACTIVE.txt",
    ips: "https://raw.githubusercontent.com/Phishing-Database/Phishing.Database/master/phishing-IPs-ACTIVE.txt"
  },
  openphish: {
    urls: "https://openphish.com/feed.txt"
  }
});

export const dbConfig = Object.freeze({
  name: "ai-privacy-sentinel-db",
  version: 1
});
