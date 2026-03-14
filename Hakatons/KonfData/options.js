// @ts-check

const DEFAULT_SETTINGS = {
  scan: {
    email: true,
    apiKey: true,
    jwt: true,
    card: true
  },
  mode: {
    strict: true,
    autoMask: false,
    autoMaskConfirm: false
  },
  scope: {
    mode: "llm",
    customHosts: []
  },
  exceptions: {
    enabled: true,
    hosts: ["mail.google.com", "outlook.live.com", "mail.yahoo.com", "proton.me", "accounts.google.com"]
  },
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
      virustotal: { enabled: true, useProxy: false, proxyBaseUrl: "", apiKey: "", timeoutMs: 8000, cacheTtlMs: 21600000 },
      phishtank: { enabled: true, useProxy: true, proxyBaseUrl: "", apiKey: "", timeoutMs: 8000, cacheTtlMs: 21600000 },
      openphish: { enabled: true, useProxy: false, proxyBaseUrl: "", apiKey: "", timeoutMs: 8000, cacheTtlMs: 3600000 },
      abuseipdb: { enabled: true, useProxy: false, proxyBaseUrl: "", apiKey: "", timeoutMs: 8000, cacheTtlMs: 21600000 }
    }
  }
};

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeSettings(stored) {
  const next = deepClone(DEFAULT_SETTINGS);
  if (!stored || typeof stored !== "object") {
    return next;
  }

  const merge = (target, source) => {
    for (const [key, value] of Object.entries(source || {})) {
      if (value && typeof value === "object" && !Array.isArray(value) && target[key] && typeof target[key] === "object") {
        merge(target[key], value);
      } else {
        target[key] = value;
      }
    }
  };

  merge(next, stored);
  return next;
}

function $(id) {
  return document.getElementById(id);
}

function parseList(value) {
  return `${value || ""}`
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function providerFieldId(provider, field) {
  return `${provider}-${field}`;
}

function applySettings(settings) {
  const next = mergeSettings(settings);
  $("scan-email").checked = next.scan.email;
  $("scan-apiKey").checked = next.scan.apiKey;
  $("scan-jwt").checked = next.scan.jwt;
  $("scan-card").checked = next.scan.card;
  $("mode-strict").checked = next.mode.strict;
  $("mode-autoMask").checked = next.mode.autoMask;
  $("mode-autoMaskConfirm").checked = next.mode.autoMaskConfirm;
  $(`scope-${next.scope.mode}`).checked = true;
  $("scope-custom-list").value = next.scope.customHosts.join(", ");
  $("exc-enabled").checked = next.exceptions.enabled;
  $("exc-hosts").value = next.exceptions.hosts.join(", ");

  $("ti-enabled").checked = next.threatIntel.enabled;
  $("ti-blockOnMalicious").checked = next.threatIntel.blockOnMalicious;
  $("ti-allowOverride").checked = next.threatIntel.allowOverride;
  $("ti-overrideRequireReason").checked = next.threatIntel.overrideRequireReason;
  $("ti-suspiciousTlds").value = next.threatIntel.suspiciousTlds.join(", ");
  $("ti-suspiciousTldBlocks").checked = next.threatIntel.suspiciousTldBlocks;
  $("ti-phishingDatabaseSyncHours").value = String(next.threatIntel.phishingDatabaseSyncHours);
  $("ti-dohResolverUrl").value = next.threatIntel.dohResolverUrl;

  for (const provider of Object.keys(next.threatIntel.providers)) {
    const value = next.threatIntel.providers[provider];
    $(providerFieldId(provider, "enabled")).checked = value.enabled;
    $(providerFieldId(provider, "useProxy")).checked = value.useProxy;
    $(providerFieldId(provider, "proxyBaseUrl")).value = value.proxyBaseUrl;
    $(providerFieldId(provider, "apiKey")).value = value.apiKey;
    $(providerFieldId(provider, "timeoutMs")).value = String(value.timeoutMs);
    $(providerFieldId(provider, "cacheTtlMs")).value = String(value.cacheTtlMs);
  }
}

function readSettings() {
  const providers = {};
  for (const provider of ["virustotal", "phishtank", "openphish", "abuseipdb"]) {
    providers[provider] = {
      enabled: $(providerFieldId(provider, "enabled")).checked,
      useProxy: $(providerFieldId(provider, "useProxy")).checked,
      proxyBaseUrl: $(providerFieldId(provider, "proxyBaseUrl")).value.trim(),
      apiKey: $(providerFieldId(provider, "apiKey")).value.trim(),
      timeoutMs: Number($(providerFieldId(provider, "timeoutMs")).value || 8000),
      cacheTtlMs: Number($(providerFieldId(provider, "cacheTtlMs")).value || 3600000)
    };
  }

  return {
    scan: {
      email: $("scan-email").checked,
      apiKey: $("scan-apiKey").checked,
      jwt: $("scan-jwt").checked,
      card: $("scan-card").checked
    },
    mode: {
      strict: $("mode-strict").checked,
      autoMask: $("mode-autoMask").checked,
      autoMaskConfirm: $("mode-autoMaskConfirm").checked
    },
    scope: {
      mode: $("scope-global").checked ? "global" : $("scope-custom").checked ? "custom" : "llm",
      customHosts: parseList($("scope-custom-list").value)
    },
    exceptions: {
      enabled: $("exc-enabled").checked,
      hosts: parseList($("exc-hosts").value)
    },
    threatIntel: {
      enabled: $("ti-enabled").checked,
      blockOnMalicious: $("ti-blockOnMalicious").checked,
      allowOverride: $("ti-allowOverride").checked,
      overrideRequireReason: $("ti-overrideRequireReason").checked,
      suspiciousTlds: parseList($("ti-suspiciousTlds").value).map((item) => item.startsWith(".") ? item.toLowerCase() : `.${item.toLowerCase()}`),
      suspiciousTldBlocks: $("ti-suspiciousTldBlocks").checked,
      phishingDatabaseSyncHours: Number($("ti-phishingDatabaseSyncHours").value || 12),
      dohResolverUrl: $("ti-dohResolverUrl").value.trim(),
      providers
    }
  };
}

async function saveSettings() {
  await chrome.storage.sync.set({ aiPrivacySettings: readSettings() });
  $("status").textContent = "Настройки сохранены";
  setTimeout(() => {
    if ($("status").textContent === "Настройки сохранены") {
      $("status").textContent = "";
    }
  }, 1800);
}

async function init() {
  const stored = await chrome.storage.sync.get("aiPrivacySettings");
  applySettings(stored.aiPrivacySettings);
  document.addEventListener("change", saveSettings);
  document.addEventListener("input", (event) => {
    if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement) {
      saveSettings();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
