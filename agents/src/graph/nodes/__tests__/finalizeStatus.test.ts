import { describe, it, expect } from "vitest";
import { finalizeStatusNode } from "../finalizeStatus.js";

describe("finalizeStatusNode", () => {
  it("uses a successful executor result as the terminal success signal", async () => {
    const result = await finalizeStatusNode({
      executorResult: {
        stdout: "ok",
        stderr: "",
        exitCode: 0,
        durationMs: 100,
        signal: null,
      },
      drafts: [],
      criticVerdicts: [],
      attemptNumber: 1,
    } as any);

    expect(result.status).toBe("success");
  });

  it("uses a failed executor result as graceful_failure", async () => {
    const result = await finalizeStatusNode({
      executorResult: {
        stdout: "",
        stderr: "error",
        exitCode: 1,
        durationMs: 100,
        signal: null,
      },
      drafts: [],
      criticVerdicts: [],
      attemptNumber: 1,
    } as any);

    expect(result.status).toBe("graceful_failure");
  });

  it("returns success when current-attempt verdicts are all accepted", async () => {
    const result = await finalizeStatusNode({
      executorResult: undefined,
      attemptNumber: 1,
      drafts: [
        {
          agentType: "doc_gen",
          content: "/** docs */",
          attemptNumber: 1,
          toolsUsed: [],
        },
      ],
      criticVerdicts: [
        {
          agentType: "doc_gen",
          accepted: true,
          reason: "passed",
          unmetRequirements: [],
        },
      ],
    } as any);

    expect(result.status).toBe("success");
  });

  it("returns graceful_failure when a current-attempt verdict is rejected", async () => {
    const result = await finalizeStatusNode({
      executorResult: undefined,
      attemptNumber: 1,
      drafts: [
        {
          agentType: "doc_gen",
          content: "/** docs */",
          attemptNumber: 1,
          toolsUsed: [],
        },
      ],
      criticVerdicts: [
        {
          agentType: "doc_gen",
          accepted: false,
          reason: "failed",
          unmetRequirements: ["document the function"],
        },
      ],
    } as any);

    expect(result.status).toBe("graceful_failure");
  });
});