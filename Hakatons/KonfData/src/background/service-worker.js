// @ts-check

import { runL1Check } from "./l1-gate.js";
import { incrementMetric } from "./metrics.js";
import { putRecord } from "./db.js";
import { upsertLinkRecord, recordOverride } from "./link-store.js";
import { normalizeUrl, extractDomain } from "../shared/url-utils.js";
import { getSettings } from "./settings.js";
import { logInfo, logWarn } from "./logging.js";

chrome.runtime.onInstalled.addListener(() => {
  logInfo("extension_installed", {});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== "object") {
    return false;
  }

  if (message.type === "L1_CHECK_URL") {
    handleUrlEvaluation(message.payload, sender)
      .then(sendResponse)
      .catch((error) => {
        logWarn("l1_check_failed", { error: String(error) });
        sendResponse({ ok: false, error: String(error) });
      });
    return true;
  }

  if (message.type === "L1_OVERRIDE") {
    handleOverride(message.payload)
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message.type === "GET_TI_SETTINGS") {
    getSettings().then((settings) => sendResponse({ ok: true, settings }));
    return true;
  }

  return false;
});

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0 || !details.url || details.url.startsWith("chrome-extension://")) {
    return;
  }

  const settings = await getSettings();
  if (!settings.threatIntel.enabled || !settings.threatIntel.blockOnMalicious) {
    return;
  }

  const result = await handleUrlEvaluation({ url: details.url, sourceContext: "navigation" }, null, { silent: true });
  if (!result?.ok || result.result?.verdict !== "REJECT" || !details.tabId) {
    return;
  }

  const warningUrl = chrome.runtime.getURL(`warning.html?eventId=${encodeURIComponent(result.eventId)}&url=${encodeURIComponent(details.url)}`);
  chrome.tabs.update(details.tabId, { url: warningUrl });
});

/**
 * @param {{ url: string; sourceContext?: import("../shared/types.js").SourceContext; ips?: string[] }} payload
 * @param {chrome.runtime.MessageSender | null} sender
 * @param {{ silent?: boolean }} [options]
 */
async function handleUrlEvaluation(payload, sender, options = {}) {
  const normalizedUrl = normalizeUrl(payload.url);
  const l1 = await runL1Check({
    urls: [normalizedUrl],
    domains: [extractDomain(normalizedUrl)],
    ips: payload.ips || [],
    sourceContext: payload.sourceContext || "unknown"
  });

  const eventId = crypto.randomUUID();
  const reasons = l1.results.filter((item) => item.is_malicious).map((item) => `${item.source}: ${item.detail}`);
  const sources = [...new Set(l1.results.filter((item) => item.is_malicious).map((item) => item.source))];
  const link = await upsertLinkRecord({
    url: normalizedUrl,
    sourceContext: payload.sourceContext || "unknown",
    ips: l1.request.ips,
    verdict: l1.verdict,
    reasons,
    sources,
    eventId
  });

  await putRecord("decisions", {
    eventId,
    linkId: link.id,
    verdict: l1.verdict,
    reasons,
    sources,
    timestamp: new Date().toISOString(),
    overrideApplied: false
  });

  if (l1.verdict === "REJECT") {
    await chrome.storage.session.set({
      [`warning:${eventId}`]: {
        eventId,
        linkId: link.id,
        url: normalizedUrl,
        result: l1,
        senderTabId: sender?.tab?.id ?? null
      }
    });
    await incrementMetric("blocked", 1);
  } else {
    await incrementMetric("allowed", 1);
  }

  if (!options.silent) {
    logInfo("url_evaluated", { url: normalizedUrl, verdict: l1.verdict, sourceContext: payload.sourceContext || "unknown" });
  }

  return { ok: true, eventId, result: l1, linkId: link.id };
}

/**
 * @param {{ eventId: string; reason: string }} payload
 */
async function handleOverride(payload) {
  const key = `warning:${payload.eventId}`;
  const entry = await chrome.storage.session.get(key);
  const warning = entry[key];
  if (!warning) {
    return { ok: false, error: "Missing warning context" };
  }
  const settings = await getSettings();
  if (!settings.threatIntel.allowOverride) {
    return { ok: false, error: "Overrides are disabled" };
  }
  if (settings.threatIntel.overrideRequireReason && !`${payload.reason || ""}`.trim()) {
    return { ok: false, error: "Override reason is required" };
  }

  await recordOverride(warning.linkId, payload.eventId, payload.reason || "User confirmed proceed");
  await putRecord("decisions", {
    eventId: `${payload.eventId}:override`,
    linkId: warning.linkId,
    verdict: "PROCEED",
    reasons: ["User override"],
    sources: warning.result.results.filter((item) => item.is_malicious).map((item) => item.source),
    timestamp: new Date().toISOString(),
    overrideApplied: true
  });
  await incrementMetric("overridden", 1);
  return { ok: true, url: warning.url };
}
