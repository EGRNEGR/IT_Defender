// @ts-check

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

async function evaluateCurrentTab() {
  const tab = await getActiveTab();
  if (!tab?.url) {
    return null;
  }
  return chrome.runtime.sendMessage({
    type: "L1_CHECK_URL",
    payload: {
      url: tab.url,
      sourceContext: "manual_scan"
    }
  });
}

async function init() {
  const hostnameEl = document.getElementById("hostname");
  const verdictEl = document.getElementById("verdict");
  const summaryEl = document.getElementById("summary");
  const flaggedEl = document.getElementById("flagged-list");
  const scanButton = document.getElementById("scan-now");
  const optionsButton = document.getElementById("open-options");

  const tab = await getActiveTab();
  hostnameEl.textContent = tab?.url ? new URL(tab.url).hostname : "Нет активной страницы";

  async function render() {
    const response = await evaluateCurrentTab();
    const result = response?.result;
    const flagged = Array.isArray(result?.results) ? result.results.filter((item) => item.is_malicious) : [];
    verdictEl.textContent = result?.verdict === "REJECT" ? "БЛОКИРОВАТЬ" : "РАЗРЕШИТЬ";
    verdictEl.className = `pill ${result?.verdict === "REJECT" ? "reject" : "proceed"}`;
    summaryEl.textContent = flagged.length
      ? `${flagged.length} ${flagged.length > 1 ? "источника пометили этот адрес." : "источник пометил этот адрес."}`
      : "L1 не обнаружил вредоносных срабатываний для этого адреса.";
    flaggedEl.innerHTML = flagged.length
      ? flagged.map((item) => `<li><strong>${item.source}</strong><span>${item.detail}</span></li>`).join("")
      : `<li><strong>Всё чисто</strong><span>Ни один источник не вернул вредоносный вердикт.</span></li>`;
  }

  scanButton?.addEventListener("click", render);
  optionsButton?.addEventListener("click", () => chrome.runtime.openOptionsPage());
  await render();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
