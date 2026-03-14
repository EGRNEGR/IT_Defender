// @ts-check

import { getRecord, putRecord } from "./db.js";

/**
 * @param {string} name
 * @param {number} [delta]
 */
export async function incrementMetric(name, delta = 1) {
  const record = (await getRecord("metrics", name)) || { id: name, value: 0 };
  record.value += delta;
  return putRecord("metrics", record);
}

export async function getMetricsSnapshot() {
  const counters = await chrome.storage.session.get("metricsSnapshot");
  return counters.metricsSnapshot || {};
}

/**
 * @param {Record<string, number>} snapshot
 */
export async function setMetricsSnapshot(snapshot) {
  await chrome.storage.session.set({ metricsSnapshot: snapshot });
}
