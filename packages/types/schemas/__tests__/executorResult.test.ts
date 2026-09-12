import { describe, it, expect } from "vitest";
import { ExecutorResultSchema } from "../executor.js";

describe("ExecutorResultSchema", () => {
  it("accepts a well-formed executor result", () => {
    const result = ExecutorResultSchema.safeParse({
      stdout: "Hello World",
      stderr: "",
      exitCode: 0,
      durationMs: 125,
      signal: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing exitCode", () => {
    const result = ExecutorResultSchema.safeParse({
      stdout: "Hello World",
      stderr: "",
      durationMs: 125,
      signal: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative durationMs", () => {
    const result = ExecutorResultSchema.safeParse({
      stdout: "Hello World",
      stderr: "",
      exitCode: 0,
      durationMs: -1,
      signal: null,
    });
    expect(result.success).toBe(false);
  });
});