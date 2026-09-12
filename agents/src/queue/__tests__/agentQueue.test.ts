// agents/src/queue/__tests__/agentQueue.test.ts
import { describe, it, expect, vi } from "vitest";

// Import whatever you export the key-builder as — exporting it (even just for
// tests) is worth doing now, since it was previously private and untestable.
import { buildIdempotencyKey } from "../agentQueue.js";

describe("buildIdempotencyKey", () => {
  it("produces the same key for identical resubmissions within the same time bucket", () => {
    const data = { sessionId: "p1", userEvent: "add docs", currentFileContent: "const x=1;" };
    const k1 = buildIdempotencyKey(data);
    const k2 = buildIdempotencyKey(data);
    expect(k1).toBe(k2);
  });

  it("produces different keys for the same input across different time buckets (regression: silent-resend bug)", async () => {
    vi.useFakeTimers();
    const data = { sessionId: "p1", userEvent: "add docs", currentFileContent: "const x=1;" };

    vi.setSystemTime(0);
    const k1 = buildIdempotencyKey(data);

    vi.setSystemTime(10_000); // well past the 3s bucket
    const k2 = buildIdempotencyKey(data);

    expect(k1).not.toBe(k2);
    vi.useRealTimers();
  });

  it("produces different keys for different sessions with identical content (no cross-user collision)", () => {
    const base = { userEvent: "add docs", currentFileContent: "const x=1;" };
    const k1 = buildIdempotencyKey({ sessionId: "p1", ...base });
    const k2 = buildIdempotencyKey({ sessionId: "p2", ...base });
    expect(k1).not.toBe(k2);
  });

  it("uses only ASCII-safe characters valid as a BullMQ jobId (regression: ':' delimiter bug)", () => {
    const key = buildIdempotencyKey({ sessionId: "p1", userEvent: "x", currentFileContent: "y" });
    expect(key).not.toContain(":");
  });
});