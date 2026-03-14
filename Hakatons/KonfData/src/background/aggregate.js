// @ts-check

import { verdicts } from "../shared/types.js";

/**
 * @param {import("../shared/types.js").CheckerResult[]} results
 * @returns {import("../shared/types.js").Verdict}
 */
export function aggregateVerdict(results) {
  return results.some((result) => result.is_malicious) ? verdicts.REJECT : verdicts.PROCEED;
}
