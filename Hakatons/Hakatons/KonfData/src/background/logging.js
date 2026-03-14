// @ts-check

/**
 * @param {Record<string, unknown>} payload
 * @returns {Record<string, unknown>}
 */
export function redactForLog(payload) {
  const next = { ...payload };
  if (typeof next.url === "string") {
    try {
      const url = new URL(next.url);
      next.url = `${url.protocol}//${url.hostname}${url.pathname}`;
    } catch {
      next.url = "[redacted-url]";
    }
  }
  if (typeof next.apiKey === "string" && next.apiKey) {
    next.apiKey = "[redacted]";
  }
  return next;
}

/**
 * @param {string} event
 * @param {Record<string, unknown>} payload
 */
export function logInfo(event, payload = {}) {
  console.info(`[AI-Privacy Sentinel] ${event}`, redactForLog(payload));
}

/**
 * @param {string} event
 * @param {Record<string, unknown>} payload
 */
export function logWarn(event, payload = {}) {
  console.warn(`[AI-Privacy Sentinel] ${event}`, redactForLog(payload));
}
