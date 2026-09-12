import { describe, it, expect, vi } from "vitest";

vi.mock("../../../llm/fallback.js", () => ({
  callWithFallback: vi.fn(),
  buildQualityChain: vi.fn(() => []),
}));

import { callWithFallback } from "../../../llm/fallback.js";
import { failureTriageNode } from "../failureTriage.js";

describe("failureTriageNode", () => {
  it("returns a runtime-error fallback when executorResult is missing", async () => {
    const result = await failureTriageNode({} as any);

    expect(result.failureTriage?.category).toBe("runtime_error");
    expect(result.failureTriage?.diagnosis).toContain("no executorResult");
    expect(callWithFallback).not.toHaveBeenCalled();
  });

  it("classifies a near-timeout SIGKILL without calling the LLM", async () => {
    const result = await failureTriageNode({
      executorResult: {
        stdout: "",
        stderr: "",
        exitCode: 1,
        durationMs: 2990,
        signal: "SIGKILL",
      },
    } as any);

    expect(result.failureTriage?.category).toBe("timeout");
    expect(result.failureTriage?.diagnosis).toContain("SIGKILL");
    expect(callWithFallback).not.toHaveBeenCalled();
  });

  it("classifies a short SIGTERM as a resource-limit failure", async () => {
    const result = await failureTriageNode({
      executorResult: {
        stdout: "",
        stderr: "",
        exitCode: 1,
        durationMs: 500,
        signal: "SIGTERM",
      },
    } as any);

    expect(result.failureTriage?.category).toBe("resource_limit");
    expect(result.failureTriage?.diagnosis).toContain("SIGTERM");
    expect(callWithFallback).not.toHaveBeenCalled();
  });

  it("falls back to runtime_error when the triage LLM returns invalid JSON", async () => {
    (callWithFallback as any).mockResolvedValueOnce({
      result: {
        content: "not json{{",
        provider: "gemini",
      },
    });

    const result = await failureTriageNode({
      executorResult: {
        stdout: "",
        stderr: "TypeError",
        exitCode: 1,
        durationMs: 100,
        signal: null,
      },
    } as any);

    expect(result.failureTriage?.category).toBe("runtime_error");
    expect(result.failureTriage?.diagnosis).toContain("unparsable JSON");
  });
});