// @ts-check

import { extractDomain, normalizeUrl } from "../src/shared/url-utils.js";
import { assertEqual } from "./test-utils.js";

export const domainTests = [
  {
    name: "extractDomain normalizes hostname and strips www",
    run() {
      assertEqual(extractDomain("https://www.Example.com/path?q=1"), "example.com", "Expected normalized domain");
    }
  },
  {
    name: "normalizeUrl removes hash and default port",
    run() {
      assertEqual(normalizeUrl("https://Example.com:443/login/#frag"), "https://example.com/login", "Expected normalized URL");
    }
  }
];
