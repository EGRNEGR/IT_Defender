(() => {
  const FIELD_SELECTOR = '[contenteditable="true"], textarea, input';
  const SEND_SELECTOR = '[aria-label="Send"], button[type="submit"]';
  const FLAG_ATTR = "data-ai-privacy-flagged";
  const STATE = new WeakMap();
  const TYPE_LABELS = {
    email: "email‑адреса",
    apiKey: "API‑ключи",
    jwt: "JWT‑токены",
    card: "номера карт",
    phone: "телефоны",
    awsAccessKey: "AWS‑ключи",
    privateKey: "приватные ключи"
  };
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
  const LLM_HOSTS = new Set(["chatgpt.com", "chat.openai.com", "claude.ai", "gemini.google.com"]);
  let CURRENT_SETTINGS = DEFAULT_SETTINGS;

  function getSettings() {
    return CURRENT_SETTINGS || DEFAULT_SETTINGS;
  }

  function applySettings(next) {
    const base = DEFAULT_SETTINGS;
    const merged = {
      scan: { ...base.scan },
      mode: { ...base.mode },
      scope: {
        mode: base.scope.mode,
        customHosts: [...base.scope.customHosts]
      },
      exceptions: {
        enabled: base.exceptions.enabled,
        hosts: [...base.exceptions.hosts]
      }
    };

    if (next && typeof next === "object") {
      if (next.scan && typeof next.scan === "object") {
        for (const key of Object.keys(merged.scan)) {
          if (typeof next.scan[key] === "boolean") {
            merged.scan[key] = next.scan[key];
          }
        }
      }

      if (next.mode && typeof next.mode === "object") {
        if (typeof next.mode.strict === "boolean") {
          merged.mode.strict = next.mode.strict;
        }
        if (typeof next.mode.autoMask === "boolean") {
          merged.mode.autoMask = next.mode.autoMask;
        }
        if (typeof next.mode.autoMaskConfirm === "boolean") {
          merged.mode.autoMaskConfirm = next.mode.autoMaskConfirm;
        }
      }

      if (next.scope && typeof next.scope === "object") {
        if (typeof next.scope.mode === "string") {
          merged.scope.mode = next.scope.mode;
        }
        if (Array.isArray(next.scope.customHosts)) {
          merged.scope.customHosts = next.scope.customHosts.filter((item) => typeof item === "string");
        }
      }

      if (next.exceptions && typeof next.exceptions === "object") {
        if (typeof next.exceptions.enabled === "boolean") {
          merged.exceptions.enabled = next.exceptions.enabled;
        }
        if (Array.isArray(next.exceptions.hosts)) {
          merged.exceptions.hosts = next.exceptions.hosts.filter((item) => typeof item === "string");
        }
      }
    }

    CURRENT_SETTINGS = merged;
  }

  function loadSettings() {
    if (!("chrome" in window) || !chrome.storage || !chrome.storage.sync) {
      return;
    }

    try {
      chrome.storage.sync.get("aiPrivacySettings", (result) => {
        const error = chrome.runtime?.lastError;
        if (error) {
          console.warn("AI-Privacy Sentinel: failed to load settings", error);
          return;
        }

        applySettings(result?.aiPrivacySettings);
        startForPage();
      });
    } catch (error) {
      console.warn("AI-Privacy Sentinel: error while loading settings", error);
      startForPage();
    }
  }

  function isPageInScope(settings) {
    let hostname = "";
    try {
      hostname = window.location.hostname || "";
    } catch {
      return false;
    }

    const scope = settings.scope || {};
    const exceptions = settings.exceptions || {};
    const mode = scope.mode || "llm";

    if (exceptions.enabled) {
      const list = Array.isArray(exceptions.hosts) ? exceptions.hosts : [];
      if (
        list.some((raw) => {
          const value = (raw || "").toString().trim().toLowerCase();
          if (!value) return false;
          if (hostname.toLowerCase() === value) return true;
          return hostname.toLowerCase().endsWith(`.${value}`);
        })
      ) {
        return false;
      }
    }

    if (mode === "global") {
      return true;
    }

    if (mode === "custom") {
      const list = Array.isArray(scope.customHosts) ? scope.customHosts : [];
      if (!list.length) return false;
      return list.some((raw) => {
        const value = (raw || "").toString().trim().toLowerCase();
        if (!value) return false;
        if (hostname.toLowerCase() === value) return true;
        return hostname.toLowerCase().endsWith(`.${value}`);
      });
    }

    // mode === "llm" по умолчанию
    return LLM_HOSTS.has(hostname);
  }

  function summarizeFindings(findings) {
    if (!Array.isArray(findings) || findings.length === 0) {
      return "";
    }

    const counters = Object.create(null);

    for (const item of findings) {
      if (!item) continue;
      const type = item.type || "other";
      counters[type] = (counters[type] || 0) + 1;
    }

    const parts = [];

    for (const [type, count] of Object.entries(counters)) {
      if (!count) continue;
      const label = TYPE_LABELS[type] || type;
      parts.push(`${label}: ${count}`);
    }

    if (!parts.length) {
      return "";
    }

    return `Найдено: ${parts.join(", ")}. Замаскируйте данные перед отправкой.`;
  }

  function getFieldText(element) {
    if (!element) {
      return "";
    }

    if (element.isContentEditable) {
      return element.innerText || element.textContent || "";
    }

    return element.value || "";
  }

  function setFieldText(element, value) {
    if (element.isContentEditable) {
      element.textContent = value;
    } else {
      element.value = value;
    }

    element.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
  }

  function analyzeField(element) {
    if (!element) {
      return;
    }

    const text = getFieldText(element);
    const findings = window.AIPrivacyDetector.findSensitiveData(text);
    const settings = getSettings();
    const filteredFindings = Array.isArray(findings)
      ? findings.filter((item) => {
          if (!item || !item.type) return true;
          const type = item.type;
          if (type === "email") return settings.scan.email;
          if (type === "apiKey") return settings.scan.apiKey;
          if (type === "jwt") return settings.scan.jwt;
          if (type === "card") return settings.scan.card;
          return true;
        })
      : [];
    const state = {
      findings: filteredFindings,
      maskedText: filteredFindings.length ? window.AIPrivacyDetector.maskText(text, filteredFindings) : text,
      originalText: text
    };

    STATE.set(element, state);
    renderFieldState(element, state);
  }

  function renderFieldState(element, state) {
    if (state.findings.length > 0) {
      element.style.outline = "2px solid #b91c1c";
      element.style.outlineOffset = "2px";
      element.setAttribute(FLAG_ATTR, "true");
      window.AIPrivacyUI.showShield(element.getBoundingClientRect(), state.findings.length);
      return;
    }

    element.style.outline = "";
    element.style.outlineOffset = "";
    element.removeAttribute(FLAG_ATTR);
    window.AIPrivacyUI.hideShield();
  }

  function maskField(element) {
    const state = STATE.get(element);
    if (!state || state.findings.length === 0) {
      return false;
    }

    setFieldText(element, state.maskedText);
    analyzeField(element);
    return true;
  }

  function handleInputEvent(event) {
    if (!(event.target instanceof Element)) {
      return;
    }

    const field = event.target.closest(FIELD_SELECTOR);
    if (!field) {
      return;
    }

    analyzeField(field);
  }

  function findAssociatedField(button) {
    const form = button.closest("form");
    if (form) {
      const candidates = [...form.querySelectorAll(FIELD_SELECTOR)];
      return candidates.find((item) => getFieldText(item).trim().length > 0) || candidates[0] || null;
    }

    const allFields = [...document.querySelectorAll(FIELD_SELECTOR)];
    return allFields.find((item) => getFieldText(item).trim().length > 0) || null;
  }

  function interceptSend(event) {
    if (!(event.target instanceof Element)) {
      return;
    }

    const button = event.target.closest(SEND_SELECTOR);
    if (!button) {
      return;
    }

    const field = findAssociatedField(button);
    if (!field) {
      return;
    }

    analyzeField(field);
    const state = STATE.get(field);

    if (!state || state.findings.length === 0) {
      return;
    }

    const settings = getSettings();

    // Если включена автоматическая маскировка
    if (settings.mode.autoMask) {
      // и включено подтверждение — показываем всплывающее окно
      if (settings.mode.autoMaskConfirm) {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.AIPrivacyUI.showModal(
          field,
          state.findings.length,
          "Найдено чувствительные данные. Заменить их масками перед отправкой?",
          (activeField) => {
            const masked = maskField(activeField);
            if (!masked) {
              return;
            }
            button.click();
          },
          () => {
            activeElementFocus(field);
          }
        );
        return;
      }

      // без подтверждения просто заменяем текст и не блокируем отправку
      const masked = maskField(field);
      if (!masked) {
        return;
      }
      return;
    }

    // В мягком режиме только подсветка и щит, отправку не блокируем.
    if (!settings.mode.strict) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    window.AIPrivacyUI.showModal(
      field,
      state.findings.length,
      summarizeFindings(state.findings),
      (activeField) => {
        const masked = maskField(activeField);
        if (!masked) {
          return;
        }
        button.click();
      },
      () => {
        activeElementFocus(field);
      }
    );
  }

  function handleKeydown(event) {
    if (!(event.target instanceof Element)) {
      return;
    }

    const field = event.target.closest(FIELD_SELECTOR);
    if (!field) {
      return;
    }

    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    analyzeField(field);
    const state = STATE.get(field);
    if (!state || state.findings.length === 0) {
      return;
    }

    const settings = getSettings();

    if (settings.mode.autoMask) {
      if (settings.mode.autoMaskConfirm) {
        event.preventDefault();
        event.stopImmediatePropagation();

        window.AIPrivacyUI.showModal(
          field,
          state.findings.length,
          "Найдено чувствительные данные. Заменить их масками перед отправкой?",
          (activeField) => {
            const masked = maskField(activeField);
            if (!masked) {
              return;
            }
            activeElementFocus(activeField);
          },
          () => {
            activeElementFocus(field);
          }
        );
        return;
      }

      const masked = maskField(field);
      if (!masked) {
        return;
      }
      return;
    }

    if (!settings.mode.strict) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    window.AIPrivacyUI.showModal(
      field,
      state.findings.length,
      summarizeFindings(state.findings),
      (activeField) => {
        const masked = maskField(activeField);
        if (!masked) {
          return;
        }
        activeElementFocus(activeField);
      },
      () => {
        activeElementFocus(field);
      }
    );
  }

  function activeElementFocus(field) {
    if (field && typeof field.focus === "function") {
      field.focus();
    }
  }

  function attachListeners(element) {
    if (element.dataset.aiPrivacyBound === "true") {
      return;
    }

    element.dataset.aiPrivacyBound = "true";
    element.addEventListener("input", handleInputEvent, true);
    element.addEventListener("paste", handleInputEvent, true);
  }

  function scanForFields(root = document) {
    const fields = root.querySelectorAll ? root.querySelectorAll(FIELD_SELECTOR) : [];
    fields.forEach(attachListeners);
  }

  function observeDom() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) {
            return;
          }

          if (node.matches(FIELD_SELECTOR)) {
            attachListeners(node);
          }

          scanForFields(node);
        });
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function startForPage() {
    const settings = getSettings();
    if (!isPageInScope(settings)) {
      return;
    }

    scanForFields();
    observeDom();
    document.addEventListener("click", interceptSend, true);
    document.addEventListener("keydown", handleKeydown, true);
  }

  function init() {
    if (!("chrome" in window) || !chrome.storage || !chrome.storage.sync) {
      startForPage();
      return;
    }

    loadSettings();
  }

  init();
})();
