// @ts-check

async function init() {
  const params = new URLSearchParams(window.location.search);
  const eventId = params.get("eventId") || "";
  const fallbackUrl = params.get("url") || "";
  const card = document.getElementById("details");
  const title = document.getElementById("risk-title");
  const summary = document.getElementById("risk-summary");
  const urlEl = document.getElementById("blocked-url");
  const backButton = document.getElementById("go-back");
  const copyButton = document.getElementById("copy-url");
  const continueButton = document.getElementById("continue-anyway");
  const reportButton = document.getElementById("report-fp");
  const confirmWrap = document.getElementById("confirm-wrap");
  const reasonInput = /** @type {HTMLTextAreaElement | null} */ (document.getElementById("override-reason"));

  const settingsResponse = await chrome.runtime.sendMessage({ type: "GET_TI_SETTINGS" });
  const allowOverride = Boolean(settingsResponse?.settings?.threatIntel?.allowOverride);
  if (!allowOverride && continueButton) {
    continueButton.hidden = true;
  }

  const sessionEntry = eventId ? await chrome.storage.session.get(`warning:${eventId}`) : {};
  const warning = sessionEntry[`warning:${eventId}`];
  const result = warning?.result;
  const url = warning?.url || fallbackUrl;
  const flagged = Array.isArray(result?.results) ? result.results.filter((item) => item.is_malicious) : [];

  title.textContent = "Переход к подозрительному адресу заблокирован";
  summary.textContent = flagged.length
    ? `Этот адрес заблокирован, потому что ${flagged.length} ${flagged.length > 1 ? "источника отметили его как вредоносный" : "источник отметил его как вредоносный"}.`
    : "Этот адрес заблокирован политикой расширения.";
  urlEl.textContent = url;

  if (card) {
    card.innerHTML = flagged.length
      ? flagged
          .map(
            (item) =>
              `<article class="detail-card"><div class="detail-head"><strong>${item.source}</strong><span>${item.kind || "signal"}</span></div><p>${item.detail}</p></article>`
          )
          .join("")
      : `<article class="detail-card"><p>Для этого события нет подробностей по отдельным источникам.</p></article>`;
  }

  backButton?.addEventListener("click", () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.close();
  });

  copyButton?.addEventListener("click", async () => {
    await navigator.clipboard.writeText(url);
    copyButton.textContent = "Скопировано";
  });

  reportButton?.addEventListener("click", () => {
    window.open(`mailto:support@example.com?subject=%D0%9B%D0%BE%D0%B6%D0%BD%D0%BE%D0%B5%20%D1%81%D1%80%D0%B0%D0%B1%D0%B0%D1%82%D1%8B%D0%B2%D0%B0%D0%BD%D0%B8%D0%B5&body=${encodeURIComponent(url)}`, "_blank");
  });

  continueButton?.addEventListener("click", async () => {
    confirmWrap.hidden = false;
    continueButton.hidden = true;
  });

  document.getElementById("confirm-continue")?.addEventListener("click", async () => {
    const reason = reasonInput?.value?.trim() || "Пользователь подтвердил продолжение";
    const response = await chrome.runtime.sendMessage({ type: "L1_OVERRIDE", payload: { eventId, reason } });
    if (!response?.ok) {
      return;
    }
    window.location.href = response.url;
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
