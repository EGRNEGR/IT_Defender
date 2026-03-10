(() => {
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
      mode: "llm", // llm | global | custom
      customHosts: []
    },
    exceptions: {
      enabled: true,
      hosts: [
        "mail.google.com",
        "outlook.live.com",
        "mail.yahoo.com",
        "proton.me",
        "accounts.google.com",
        "login.live.com",
        "id.apple.com",
        "docs.google.com",
        "forms.gle"
      ]
    }
  };

  const FIELD_IDS = {
    scan: {
      email: "scan-email",
      apiKey: "scan-apiKey",
      jwt: "scan-jwt",
      card: "scan-card"
    },
    mode: {
      strict: "mode-strict",
      autoMask: "auto-mask",
      autoMaskConfirm: "mode-autoMaskConfirm"
    },
    scope: {
      global: "scope-global",
      llm: "scope-llm",
      custom: "scope-custom",
      customList: "scope-custom-list"
    },
    exceptions: {
      enabled: "exc-enabled",
      hosts: "exc-hosts"
    }
  };

  function $(id) {
    return document.getElementById(id);
  }

  function getStatusElement() {
    return document.getElementById("status");
  }

  function mergeSettings(stored) {
    const result = structuredClone
      ? structuredClone(DEFAULT_SETTINGS)
      : JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

    if (!stored || typeof stored !== "object") {
      return result;
    }

    if (stored.scan) {
      for (const key of Object.keys(result.scan)) {
        if (typeof stored.scan[key] === "boolean") {
          result.scan[key] = stored.scan[key];
        }
      }
    }

    if (stored.mode) {
      if (typeof stored.mode.strict === "boolean") {
        result.mode.strict = stored.mode.strict;
      }
      if (typeof stored.mode.autoMask === "boolean") {
        result.mode.autoMask = stored.mode.autoMask;
      }
      if (typeof stored.mode.autoMaskConfirm === "boolean") {
        result.mode.autoMaskConfirm = stored.mode.autoMaskConfirm;
      }
    }

    if (stored.scope) {
      if (typeof stored.scope.mode === "string") {
        result.scope.mode = stored.scope.mode;
      }
      if (Array.isArray(stored.scope.customHosts)) {
        result.scope.customHosts = stored.scope.customHosts.filter((item) => typeof item === "string");
      }
    }

    if (stored.exceptions) {
      if (typeof stored.exceptions.enabled === "boolean") {
        result.exceptions.enabled = stored.exceptions.enabled;
      }
      if (Array.isArray(stored.exceptions.hosts)) {
        result.exceptions.hosts = stored.exceptions.hosts.filter((item) => typeof item === "string");
      }
    }

    return result;
  }

  function readForm() {
    return {
      scan: {
        email: !!$(FIELD_IDS.scan.email)?.checked,
        apiKey: !!$(FIELD_IDS.scan.apiKey)?.checked,
        jwt: !!$(FIELD_IDS.scan.jwt)?.checked,
        card: !!$(FIELD_IDS.scan.card)?.checked
      },
      mode: {
        strict: !!$(FIELD_IDS.mode.strict)?.checked,
        autoMask: !!$(FIELD_IDS.mode.autoMask)?.checked,
        autoMaskConfirm: !!$(FIELD_IDS.mode.autoMaskConfirm)?.checked
      },
      scope: {
        mode: (() => {
          if ($(FIELD_IDS.scope.global)?.checked) return "global";
          if ($(FIELD_IDS.scope.custom)?.checked) return "custom";
          return "llm";
        })(),
        customHosts: (() => {
          const raw = $(FIELD_IDS.scope.customList)?.value || "";
          return raw
            .split(/[\n,]/)
            .map((item) => item.trim())
            .filter(Boolean);
        })()
      },
      exceptions: {
        enabled: !!$(FIELD_IDS.exceptions.enabled)?.checked,
        hosts: (() => {
          const raw = $(FIELD_IDS.exceptions.hosts)?.value || "";
          return raw
            .split(/[\n,]/)
            .map((item) => item.trim())
            .filter(Boolean);
        })()
      }
    };
  }

  function applyToForm(settings) {
    const next = mergeSettings(settings);

    const email = $(FIELD_IDS.scan.email);
    const apiKey = $(FIELD_IDS.scan.apiKey);
    const jwt = $(FIELD_IDS.scan.jwt);
    const card = $(FIELD_IDS.scan.card);
    const strict = $(FIELD_IDS.mode.strict);
    const autoMask = $(FIELD_IDS.mode.autoMask);
    const autoMaskConfirm = $(FIELD_IDS.mode.autoMaskConfirm);
    const scopeGlobal = $(FIELD_IDS.scope.global);
    const scopeLlm = $(FIELD_IDS.scope.llm);
    const scopeCustom = $(FIELD_IDS.scope.custom);
    const scopeCustomList = $(FIELD_IDS.scope.customList);
    const excEnabled = $(FIELD_IDS.exceptions.enabled);
    const excHosts = $(FIELD_IDS.exceptions.hosts);

    if (email) email.checked = next.scan.email;
    if (apiKey) apiKey.checked = next.scan.apiKey;
    if (jwt) jwt.checked = next.scan.jwt;
    if (card) card.checked = next.scan.card;
    if (strict) strict.checked = next.mode.strict;
    if (autoMask) autoMask.checked = next.mode.autoMask;
    if (autoMaskConfirm) autoMaskConfirm.checked = next.mode.autoMaskConfirm;

    if (scopeGlobal || scopeLlm || scopeCustom) {
      const mode = next.scope.mode || "llm";
      if (scopeGlobal) scopeGlobal.checked = mode === "global";
      if (scopeLlm) scopeLlm.checked = mode === "llm";
      if (scopeCustom) scopeCustom.checked = mode === "custom";
    }

    if (scopeCustomList) {
      scopeCustomList.value = (next.scope.customHosts || []).join(", ");
    }

    if (excEnabled) {
      excEnabled.checked = !!next.exceptions.enabled;
    }
    if (excHosts) {
      excHosts.value = (next.exceptions.hosts || []).join(", ");
    }
  }

  function showStatus(message) {
    const el = getStatusElement();
    if (!el) return;
    el.textContent = message;
    if (!message) return;

    setTimeout(() => {
      if (el.textContent === message) {
        el.textContent = "";
      }
    }, 2000);
  }

  function saveSettings() {
    const value = readForm();

    chrome.storage.sync.set({ aiPrivacySettings: value }, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        console.warn("AI-Privacy Sentinel: failed to save settings", error);
        showStatus("Не удалось сохранить настройки");
        return;
      }

      showStatus("Настройки сохранены");
    });
  }

  function init() {
    if (!("chrome" in window) || !chrome.storage || !chrome.storage.sync) {
      console.warn("AI-Privacy Sentinel: chrome.storage.sync is not available");
      applyToForm(DEFAULT_SETTINGS);
      return;
    }

    chrome.storage.sync.get("aiPrivacySettings", (result) => {
      const error = chrome.runtime.lastError;
      if (error) {
        console.warn("AI-Privacy Sentinel: failed to load settings", error);
        applyToForm(DEFAULT_SETTINGS);
        return;
      }

      applyToForm(result.aiPrivacySettings || DEFAULT_SETTINGS);
    });

    document.addEventListener("change", (event) => {
      if (!(event.target instanceof HTMLInputElement)) {
        return;
      }

      if (!event.target.id) {
        return;
      }

      // Любое изменение чекбокса сразу сохраняет настройки
      saveSettings();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

