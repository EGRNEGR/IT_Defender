(() => {
  const ROOT_ID = "ai-privacy-link-guard-root";

  function ensureBannerRoot() {
    let root = document.getElementById(ROOT_ID);
    if (root) {
      return root;
    }

    root = document.createElement("div");
    root.id = ROOT_ID;
    root.style.position = "fixed";
    root.style.top = "20px";
    root.style.right = "20px";
    root.style.zIndex = "2147483647";
    root.style.maxWidth = "360px";
    document.documentElement.appendChild(root);
    return root;
  }

  function showBanner(title, body, tone = "danger") {
    const root = ensureBannerRoot();
    const card = document.createElement("div");
    card.style.marginBottom = "12px";
    card.style.padding = "14px 16px";
    card.style.borderRadius = "18px";
    card.style.backdropFilter = "blur(20px)";
    card.style.background = tone === "danger" ? "rgba(125, 13, 31, 0.94)" : "rgba(20, 83, 45, 0.94)";
    card.style.color = "#fff";
    card.style.boxShadow = "0 20px 40px rgba(15, 23, 42, 0.25)";
    card.style.border = "1px solid rgba(255, 255, 255, 0.12)";
    card.innerHTML = `<strong style="display:block;margin-bottom:6px;font:600 13px/1.4 ui-sans-serif,system-ui;">${title}</strong><span style="font:500 12px/1.5 ui-sans-serif,system-ui;">${body}</span>`;
    root.appendChild(card);
    setTimeout(() => card.remove(), 4500);
  }

  function extractCandidateUrl(text) {
    const match = `${text || ""}`.match(/https?:\/\/[^\s<>"']+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>"']*)?/i);
    return match ? match[0] : "";
  }

  async function evaluateUrl(url, sourceContext) {
    if (!url || !chrome.runtime?.sendMessage) {
      return null;
    }
    return chrome.runtime.sendMessage({
      type: "L1_CHECK_URL",
      payload: { url, sourceContext }
    });
  }

  document.addEventListener(
    "click",
    async (event) => {
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!anchor) {
        return;
      }
      const href = anchor.href || "";
      if (!href || href.startsWith("chrome-extension://") || href.startsWith("javascript:")) {
        return;
      }

      const response = await evaluateUrl(href, "link_click");
      if (!response?.ok || response.result?.verdict !== "REJECT") {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.href = chrome.runtime.getURL(
        `warning.html?eventId=${encodeURIComponent(response.eventId)}&url=${encodeURIComponent(href)}`
      );
    },
    true
  );

  document.addEventListener(
    "paste",
    async (event) => {
      const text = event.clipboardData?.getData("text") || "";
      const candidate = extractCandidateUrl(text);
      if (!candidate) {
        return;
      }
      const response = await evaluateUrl(candidate, "paste");
      if (!response?.ok || response.result?.verdict !== "REJECT") {
        return;
      }

      event.preventDefault();
      showBanner("Подозрительная ссылка заблокирована", "Вставленный URL совпал с одним или несколькими источниками фишинг-аналитики.");
    },
    true
  );
})();
