import test from "node:test";
import assert from "node:assert/strict";
import { shouldRunSync, summarizeSyncErrors } from "../src/lib/sync-policy.ts";

test("shouldRunSync runs when forced", () => {
  assert.equal(
    shouldRunSync(new Date("2026-07-08T10:00:00Z"), 3_600_000, {
      force: true,
      now: new Date("2026-07-08T10:01:00Z"),
    }),
    true,
  );
});

test("shouldRunSync skips recent syncs", () => {
  assert.equal(
    shouldRunSync(new Date("2026-07-08T10:00:00Z"), 3_600_000, {
      now: new Date("2026-07-08T10:30:00Z"),
    }),
    false,
  );
});

test("shouldRunSync runs stale syncs", () => {
  assert.equal(
    shouldRunSync(new Date("2026-07-08T10:00:00Z"), 3_600_000, {
      now: new Date("2026-07-08T11:01:00Z"),
    }),
    true,
  );
});

test("summarizeSyncErrors limits noisy channel failures", () => {
  assert.equal(
    summarizeSyncErrors(["A failed", "B failed", "C failed"], 2),
    "A failed\nB failed\n1 more channel errors.",
  );
});
