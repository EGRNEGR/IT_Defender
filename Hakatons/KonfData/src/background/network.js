// @ts-check

import { logWarn } from "./logging.js";

const pending = new Map();

export class CircuitBreaker {
  /**
   * @param {number} threshold
   * @param {number} cooldownMs
   */
  constructor(threshold = 3, cooldownMs = 60_000) {
    this.threshold = threshold;
    this.cooldownMs = cooldownMs;
    this.failures = 0;
    this.openUntil = 0;
  }

  isOpen() {
    return this.openUntil > Date.now();
  }

  onSuccess() {
    this.failures = 0;
    this.openUntil = 0;
  }

  onFailure() {
    this.failures += 1;
    if (this.failures >= this.threshold) {
      this.openUntil = Date.now() + this.cooldownMs;
    }
  }
}

export class RateLimiter {
  /**
   * @param {number} maxConcurrent
   */
  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent;
    this.active = 0;
    this.queue = [];
  }

  /**
   * @template T
   * @param {() => Promise<T>} task
   * @returns {Promise<T>}
   */
  async run(task) {
    if (this.active >= this.maxConcurrent) {
      await new Promise((resolve) => this.queue.push(resolve));
    }

    this.active += 1;
    try {
      return await task();
    } finally {
      this.active -= 1;
      const next = this.queue.shift();
      if (next) {
        next();
      }
    }
  }
}

/**
 * @param {string} dedupeKey
 * @param {() => Promise<import("../shared/types.js").CheckerResult>} runner
 */
export function dedupeInflight(dedupeKey, runner) {
  const existing = pending.get(dedupeKey);
  if (existing) {
    return existing;
  }

  const task = runner().finally(() => pending.delete(dedupeKey));
  pending.set(dedupeKey, task);
  return task;
}

/**
 * @param {string} url
 * @param {RequestInit} init
 * @param {{ timeoutMs: number; retries?: number; breaker?: CircuitBreaker }} options
 * @returns {Promise<Response>}
 */
export async function fetchWithPolicy(url, init, options) {
  const retries = options.retries ?? 1;
  if (options.breaker?.isOpen()) {
    throw new Error("circuit_open");
  }

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok && response.status >= 500 && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
        continue;
      }
      options.breaker?.onSuccess();
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      options.breaker?.onFailure();
      if (attempt >= retries) {
        throw error;
      }
      logWarn("checker_retry", { url, attempt: attempt + 1, error: String(error) });
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }

  throw new Error("unreachable");
}
