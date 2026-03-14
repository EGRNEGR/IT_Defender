// @ts-check

import { findSuffixMatch } from "../src/shared/matchers.js";
import { assertEqual } from "./test-utils.js";

export const matcherTests = [
  {
    name: "suffix match detects blocked subdomain",
    run() {
      const blocked = new Set(["evil.example"]);
      assertEqual(findSuffixMatch("login.evil.example", blocked), "evil.example", "Expected suffix match");
    }
  },
  {
    name: "suffix match does not overmatch sibling domains",
    run() {
      const blocked = new Set(["evil.example"]);
      assertEqual(findSuffixMatch("safe-evil.example.org", blocked), "", "Expected no suffix match");
    }
  }
];
