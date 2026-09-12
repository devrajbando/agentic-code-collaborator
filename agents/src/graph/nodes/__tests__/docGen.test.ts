import { describe, it, expect, vi } from "vitest";

vi.mock("../../../llm/fallback.js", () => ({
  callWithFallback: vi.fn(),
  buildQualityChain: vi.fn(() => []),
}));

import { callWithFallback } from "../../../llm/fallback.js";
import { docGenNode } from "../docGen.js";

describe("docGenNode", () => {
  it("returns a graceful draft when no target function exists", async () => {
    const result = await docGenNode({
      currentFileContent: "const x = 1;",
      userEvent: "add docs",
      attemptNumber: 1,
      specs: [],
    } as any);

    expect(result.drafts).toHaveLength(1);
    expect(result.drafts?.[0]?.agentType).toBe("doc_gen");
    expect(result.drafts?.[0]?.content).toContain("No function found");
    expect(result.drafts?.[0]?.toolsUsed).toContain("ts-ast-parser");
    expect(callWithFallback).not.toHaveBeenCalled();
  });

  it("returns a valid documentation draft for a target function", async () => {
    (callWithFallback as any).mockResolvedValueOnce({
      result: {
        content: "/** Adds two numbers. */",
        provider: "gemini",
      },
    });

    const result = await docGenNode({
      currentFileContent: "function add(a: number, b: number): number { return a + b; }",
      userEvent: "add docs to add",
      attemptNumber: 1,
      specs: [],
    } as any);

    expect(result.drafts).toHaveLength(1);
    expect(result.drafts?.[0]?.agentType).toBe("doc_gen");
    expect(result.drafts?.[0]?.content).toContain("Adds two numbers");
    expect(result.drafts?.[0]?.toolsUsed).toContain("ts-ast-parser");
    expect(result.drafts?.[0]?.toolsUsed).toContain("llm:gemini");
  });

  it("falls back gracefully when the LLM draft fails schema validation", async () => {
    (callWithFallback as any).mockResolvedValueOnce({
      result: {
        content: undefined,
        provider: "gemini",
      },
    });

    const result = await docGenNode({
      currentFileContent: "function add(a: number, b: number): number { return a + b; }",
      userEvent: "add docs to add",
      attemptNumber: 1,
      specs: [],
    } as any);

    expect(result.drafts).toHaveLength(1);
    expect(result.drafts?.[0]?.agentType).toBe("doc_gen");
    expect(result.drafts?.[0]?.content).toContain("invalid draft");
  });
});