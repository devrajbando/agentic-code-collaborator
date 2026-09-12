import { describe, it, expect, vi } from "vitest";

vi.mock("../../../llm/fallback.js", () => ({
  callWithFallback: vi.fn(),
  buildQualityChain: vi.fn(() => []),
}));

vi.mock("../../../tools/snippetRetrieval.js", () => ({
  retrieveSimilarSnippets: vi.fn(),
}));

import { callWithFallback } from "../../../llm/fallback.js";
import { retrieveSimilarSnippets } from "../../../tools/snippetRetrieval.js";
import { snippetGenNode } from "../snippetGen.js";

describe("snippetGenNode", () => {
  it("generates a valid draft when no similar snippets are retrieved", async () => {
    (retrieveSimilarSnippets as any).mockResolvedValueOnce([]);

    (callWithFallback as any).mockResolvedValueOnce({
      result: {
        content: JSON.stringify({
          content: "console.log('hello');",
        }),
        provider: "gemini",
      },
    });

    const result = await snippetGenNode({
      userEvent: "print hello",
      attemptNumber: 1,
      specs: [
        {
          agentType: "snippet_gen",
          requirements: ["print hello"],
          derivedFrom: "userEvent",
          confidence: 1,
          reasoning: "test",
        },
      ],
    } as any);

    expect(result.drafts).toHaveLength(1);
    expect(result.drafts?.[0]?.agentType).toBe("snippet_gen");
    expect(result.drafts?.[0]?.content).toBe("console.log('hello');");
    expect(result.drafts?.[0]?.toolsUsed).toContain("llm:gemini");
  });

  it("returns a graceful draft when every LLM provider is exhausted", async () => {
    (retrieveSimilarSnippets as any).mockResolvedValueOnce([]);
    (callWithFallback as any).mockRejectedValueOnce(
      new Error("all quality-chain providers exhausted"),
    );

    const result = await snippetGenNode({
      userEvent: "print hello",
      attemptNumber: 1,
      specs: [],
    } as any);

    expect(result.drafts).toHaveLength(1);
    expect(result.drafts?.[0]?.agentType).toBe("snippet_gen");
    expect(result.drafts?.[0]?.content).toContain("all quality-chain providers exhausted");
  });

  it("falls back gracefully when the LLM returns unparsable JSON", async () => {
    (retrieveSimilarSnippets as any).mockResolvedValueOnce([]);

    (callWithFallback as any).mockResolvedValueOnce({
      result: {
        content: "not json{{",
        provider: "gemini",
      },
    });

    const result = await snippetGenNode({
      userEvent: "print hello",
      attemptNumber: 1,
      specs: [],
    } as any);

    expect(result.drafts).toHaveLength(1);
    expect(result.drafts?.[0]?.agentType).toBe("snippet_gen");
    expect(result.drafts?.[0]?.content).toContain("unparsable JSON");
  });
});