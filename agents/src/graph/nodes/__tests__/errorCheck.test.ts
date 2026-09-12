// agents/src/graph/nodes/__tests__/errorCheck.test.ts
import { describe, it, expect, vi } from "vitest";
vi.mock("eslint", () => ({
  ESLint: vi.fn().mockImplementation(() => ({
    lintText: vi.fn().mockRejectedValue(new Error("Could not find config file.")),
  })),
}));
import { errorCheckNode } from "../errorCheck.js";

describe("errorCheckNode", () => {
  it("degrades gracefully with a note when ESLint fails to run, still returns tsc results", async () => {
    const badSyntax = "const x = ("; // real syntax error, no LLM needed
    const result = await errorCheckNode({
      currentFileContent: badSyntax, userEvent: "check", attemptNumber: 1, specs: [],
    } as any);

    const draft = result.drafts?.[0];
    expect(draft?.content).toContain("ts-compiler-api");
    expect(draft?.content).toContain("ESLint did not run");
  });
});