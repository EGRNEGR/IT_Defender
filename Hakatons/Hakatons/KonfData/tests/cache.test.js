// @ts-check

import { computeTtlExpiry, isCacheFresh } from "../src/shared/ttl-cache.js";
import { assert, assertEqual } from "./test-utils.js";

export const cacheTests = [
  {
    name: "computeTtlExpiry advances by the requested TTL",
    run() {
      const expiry = computeTtlExpiry(1_000, 0);
      assertEqual(expiry, "1970-01-01T00:00:01.000Z", "Expected one-second expiry");
    }
  },
  {
    name: "isCacheFresh flips to false after TTL expires",
    run() {
      const expiry = computeTtlExpiry(1_000, 0);
      assert(isCacheFresh(expiry, 500), "Expected cache to still be fresh");
      assertEqual(isCacheFresh(expiry, 1_001), false, "Expected cache to expire");
    }
  }
];
