(() => {
  function updatePopupState() {
    if (!("chrome" in window) || !chrome.tabs || !chrome.scripting || !chrome.storage) {
      setStaticState();
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const [tab] = tabs || [];
      if (!tab || !tab.id) {
        setStaticState();
        return;
      }

      chrome.storage.sync.get("aiPrivacySettings", (result) => {
        const settings = result?.aiPrivacySettings || {};
        const scope = settings.scope || {};
        const exceptions = settings.exceptions || {};

        chrome.scripting.executeScript(
          {
            target: { tabId: tab.id },
            func: detectHostname,
            args: []
          },
          (injectionResults) => {
            const hostname = injectionResults && injectionResults[0] ? injectionResults[0].result : "";
            renderState(hostname, scope, exceptions);
          }
        );
      });
    });
  }

  function detectHostname() {
    try {
      return window.location.hostname || "";
    } catch {
      return "";
    }
  }

  function setStaticState() {
    const subtitle = document.getElementById("subtitle");
    const statusPill = document.getElementById("statusPill");
    const scopeHint = document.getElementById("scopeHint");
    const hostnameEl = document.getElementById("hostname");

    if (subtitle) subtitle.textContent = "Расширение активно";
    if (statusPill) {
      statusPill.textContent = "—";
      statusPill.className = "status-pill status-off";
    }
    if (scopeHint) scopeHint.textContent = "";
    if (hostnameEl) hostnameEl.textContent = "";
  }

  function renderState(hostname, scope, exceptions) {
    const subtitle = document.getElementById("subtitle");
    const statusPill = document.getElementById("statusPill");
    const scopeHint = document.getElementById("scopeHint");
    const hostnameEl = document.getElementById("hostname");

    if (hostnameEl) {
      hostnameEl.textContent = hostname ? hostname : "";
    }

    const mode = scope?.mode || "llm";
    const excEnabled = !!exceptions?.enabled;
    const excHosts = Array.isArray(exceptions?.hosts) ? exceptions.hosts : [];

    const inExceptions = excEnabled
      ? excHosts.some((raw) => {
          const value = (raw || "").toString().trim().toLowerCase();
          if (!value || !hostname) return false;
          const host = hostname.toLowerCase();
          if (host === value) return true;
          return host.endsWith(`.${value}`);
        })
      : false;

    let active = false;

    if (!hostname) {
      active = false;
    } else if (inExceptions) {
      active = false;
    } else if (mode === "global") {
      active = true;
    } else if (mode === "custom") {
      const list = Array.isArray(scope.customHosts) ? scope.customHosts : [];
      active = list.some((raw) => {
        const value = (raw || "").toString().trim().toLowerCase();
        if (!value) return false;
        const host = hostname.toLowerCase();
        if (host === value) return true;
        return host.endsWith(`.${value}`);
      });
    } else {
      const llmHosts = new Set(["chatgpt.com", "chat.openai.com", "claude.ai", "gemini.google.com"]);
      active = llmHosts.has(hostname);
    }

    if (subtitle) {
      subtitle.textContent = active ? "Защита активна" : "Защита не активна";
    }

    if (statusPill) {
      statusPill.textContent = active ? "Вкл." : "Выкл.";
      statusPill.className = `badge ${active ? "status-on" : "status-off"}`;
    }

    if (scopeHint) {
      if (!hostname) {
        scopeHint.textContent = "";
      } else if (inExceptions) {
        scopeHint.textContent = "Исключение: анализ отключён для этого сайта.";
      } else if (mode === "global") {
        scopeHint.textContent = "Режим: весь браузер.";
      } else if (mode === "custom") {
        scopeHint.textContent = "Режим: только выбранные сайты.";
      } else {
        scopeHint.textContent = "Режим: только LLM‑чаты.";
      }
    }
  }

  function init() {
    updatePopupState();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

