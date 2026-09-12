// agents/src/graph/nodes/__tests__/router.test.ts
import { describe, it, expect, vi } from "vitest";
vi.mock("../../../llm/fallback.js", () => ({
  callWithFallback: vi.fn(),
  buildFastChain: vi.fn(() => []),
}));
import { callWithFallback } from "../../../llm/fallback.js";
import { routerNode } from "../router.js";

describe("routerNode", () => {
  it("falls back to a safe needsDocs-only result on unparsable JSON", async () => {
    (callWithFallback as any).mockResolvedValueOnce({ result: { content: "not json{{" }, providerName: "groq" });

    const result = await routerNode({ userEvent: "test", currentFileContent: "" } as any);

    expect(result.routerOutput?.needsDocs).toBe(true);
    expect(result.routerOutput?.needsErrorCheck).toBe(false);
    expect(result.routerOutput?.confidence).toBe(0);
  });

  it("falls back gracefully when every provider is exhausted", async () => {
    (callWithFallback as any).mockRejectedValueOnce(new Error("all providers exhausted"));

    const result = await routerNode({ userEvent: "test", currentFileContent: "" } as any);
    expect(result.routerOutput?.confidence).toBe(0);
  });

  it("sets awaiting_hitl_router status when confidence is low and the toggle is on", async () => {
    (callWithFallback as any).mockResolvedValueOnce({
      result: { content: JSON.stringify({ needsDocs: true, needsErrorCheck: false, needsSnippet: false, confidence: 0.3, reasoning: "unsure" }) },
      providerName: "groq",
    });

    const result = await routerNode({
      userEvent: "test", currentFileContent: "", hitlEnabled: { lowConfidence: true, attempt3Rejection: false },
    } as any);

    expect(result.status).toBe("awaiting_hitl_router");
  });
});