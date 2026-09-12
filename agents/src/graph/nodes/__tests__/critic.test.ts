import { describe, it, expect, vi } from "vitest";

vi.mock("../../../llm/fallback.js", () => ({
  callWithFallback: vi.fn(),
  buildQualityChain: vi.fn(() => []),
}));

import { callWithFallback } from "../../../llm/fallback.js";
import { criticNode } from "../critic.js";

describe("criticNode", () => {
  it("returns no verdicts when there are no drafts for the current attempt", async () => {
    const result = await criticNode({
      attemptNumber: 1,
      drafts: [],
      specs: [],
      criticVerdicts: [],
    } as any);

    expect(result.criticVerdicts).toEqual([]);
    expect(callWithFallback).not.toHaveBeenCalled();
  });

  it("default-rejects a draft when the critic returns unparsable JSON", async () => {
    (callWithFallback as any).mockResolvedValueOnce({
      result: {
        content: "not valid json{{",
        provider: "groq",
      },
    });

    const result = await criticNode({
      attemptNumber: 1,
      userEvent: "add docs",
      drafts: [
        {
          agentType: "doc_gen",
          content: "/** docs */",
          attemptNumber: 1,
          toolsUsed: [],
        },
      ],
      specs: [
        {
          agentType: "doc_gen",
          requirements: ["document the function"],
          derivedFrom: "userEvent",
          confidence: 1,
          reasoning: "test",
        },
      ],
      criticVerdicts: [],
    } as any);

    expect(result.criticVerdicts).toHaveLength(1);
    expect(result.criticVerdicts?.[0]?.accepted).toBe(false);
    expect(result.criticVerdicts?.[0]?.agentType).toBe("doc_gen");
    expect(result.criticVerdicts?.[0]?.unmetRequirements).toEqual([
      "document the function",
    ]);
    expect(result.pendingRetryTargets).toEqual(["doc_gen"]);
  });

  it("returns accepted verdicts and no retry targets when all drafts pass", async () => {
    (callWithFallback as any).mockResolvedValueOnce({
      result: {
        content: JSON.stringify({
          accepted: true,
          reason: "Requirement satisfied.",
          unmetRequirements: [],
        }),
        provider: "groq",
      },
    });

    const result = await criticNode({
      attemptNumber: 1,
      userEvent: "add docs",
      drafts: [
        {
          agentType: "doc_gen",
          content: "/** docs */",
          attemptNumber: 1,
          toolsUsed: [],
        },
      ],
      specs: [
        {
          agentType: "doc_gen",
          requirements: ["document the function"],
          derivedFrom: "userEvent",
          confidence: 1,
          reasoning: "test",
        },
      ],
      criticVerdicts: [],
    } as any);

    expect(result.criticVerdicts?.[0]?.accepted).toBe(true);
    expect(result.pendingRetryTargets).toEqual([]);
  });
});