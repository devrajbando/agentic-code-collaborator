// agents/src/graph/nodes/__tests__/executor.test.ts
import { describe, it, expect, vi } from "vitest";
vi.mock("../../../tools/pistonClient.js", () => ({ pistonExecute: vi.fn() }));
import { pistonExecute } from "../../../tools/pistonClient.js";
import { executorNode } from "../executor.js";

describe("executorNode", () => {
  it("returns a graceful-failure result when no snippet_gen draft exists for the current attempt", async () => {
    const result = await executorNode({ drafts: [], attemptNumber: 1 } as any);
    expect(result.executorResult?.exitCode).toBe(1);
    expect(result.executorResult?.stderr).toContain("no snippet_gen draft");
  });

  it("maps a Piston timeout ceiling error into a clean failure result, not a thrown exception", async () => {
    (pistonExecute as any).mockRejectedValueOnce(new Error("Piston execute failed (400): run_timeout cannot exceed the configured limit of 3000"));

    const result = await executorNode({
      drafts: [{ agentType: "snippet_gen", content: "console.log(1)", attemptNumber: 1, toolsUsed: [] }],
      attemptNumber: 1,
    } as any);

    expect(result.executorResult?.exitCode).toBe(1);
    expect(result.executorResult?.stderr).toContain("run_timeout");
  });

  it("treats a signal-killed run (code: null) as exitCode 1", async () => {
    (pistonExecute as any).mockResolvedValueOnce({
      run: { stdout: "", stderr: "", code: null, signal: "SIGKILL" },
    });

    const result = await executorNode({
      drafts: [{ agentType: "snippet_gen", content: "while(true){}", attemptNumber: 1, toolsUsed: [] }],
      attemptNumber: 1,
    } as any);

    expect(result.executorResult?.exitCode).toBe(1);
    expect(result.executorResult?.signal).toBe("SIGKILL");
  });
});