// @ts-check

import { aggregateVerdict } from "../src/background/aggregate.js";
import { assertEqual } from "./test-utils.js";

export const aggregateTests = [
  {
    name: "aggregateVerdict returns PROCEED when no checker is malicious",
    run() {
      assertEqual(
        aggregateVerdict([
          { source: "local_blacklist", is_malicious: false, detail: "miss" },
          { source: "openphish", is_malicious: false, detail: "miss" }
        ]),
        "PROCEED",
        "Expected proceed verdict"
      );
    }
  },
  {
    name: "aggregateVerdict returns REJECT when any checker is malicious",
    run() {
      assertEqual(
        aggregateVerdict([
          { source: "local_blacklist", is_malicious: false, detail: "miss" },
          { source: "openphish", is_malicious: true, detail: "hit" }
        ]),
        "REJECT",
        "Expected reject verdict"
      );
    }
  }
];
