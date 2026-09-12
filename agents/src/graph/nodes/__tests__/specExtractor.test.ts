import { describe, it, expect, vi } from "vitest";

vi.mock("../../../llm/fallback.js", () => ({
  callWithFallback: vi.fn(),
  buildFastChain: vi.fn(() => []),
}));

import { callWithFallback } from "../../../llm/fallback.js";
import { specExtractorNode } from "../specExtractor.js";

describe("specExtractorNode", () => {
  it("returns no specs when the router activates no branches", async () => {
    const result = await specExtractorNode({
      userEvent: "test",
      routerOutput: {
        needsDocs: false,
        needsErrorCheck: false,
        needsSnippet: false,
        confidence: 1,
        reasoning: "nothing needed",
      },
    } as any);

    expect(result.specs).toEqual([]);
    expect(callWithFallback).not.toHaveBeenCalled();
  });

  it("falls back to a minimal spec when the LLM returns unparsable JSON", async () => {
    (callWithFallback as any).mockResolvedValueOnce({
      result: {
        content: "not valid json{{",
        provider: "groq",
      },
    });

    const result = await specExtractorNode({
      userEvent: "add docs",
      routerOutput: {
        needsDocs: true,
        needsErrorCheck: false,
        needsSnippet: false,
        confidence: 0.8,
        reasoning: "documentation requested",
      },
    } as any);

    expect(result.specs?.[0]?.agentType).toBe("doc_gen");
    expect(result.specs?.[0]?.confidence).toBe(0);
    expect(result.specs?.[0]?.requirements).toHaveLength(1);
    expect(result.specs?.[0]?.derivedFrom).toBe("userEvent");
  });

  it("creates specs only for the branches activated by the router", async () => {
    (callWithFallback as any)
      .mockResolvedValueOnce({
        result: {
          content: JSON.stringify({
            requirements: ["document the function"],
            confidence: 0.9,
            reasoning: "docs requested",
          }),
          provider: "groq",
        },
      })
      .mockResolvedValueOnce({
        result: {
          content: JSON.stringify({
            requirements: ["generate the requested snippet"],
            confidence: 0.9,
            reasoning: "snippet requested",
          }),
          provider: "groq",
        },
      });

    const result = await specExtractorNode({
      userEvent: "add docs and a snippet",
      routerOutput: {
        needsDocs: true,
        needsErrorCheck: false,
        needsSnippet: true,
        confidence: 0.9,
        reasoning: "two branches",
      },
    } as any);

    expect(result.specs).toHaveLength(2);
    expect(result.specs?.map((s) => s.agentType)).toEqual([
      "doc_gen",
      "snippet_gen",
    ]);
  });
});