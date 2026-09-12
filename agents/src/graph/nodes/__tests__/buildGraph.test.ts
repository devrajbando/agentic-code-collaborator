import { describe, it, expect, vi } from "vitest";
import { buildGraph } from "../../buildGraph";
import { errorCheckNode } from "../errorCheck.js";
import { docGenNode } from "../docGen.js";
import { snippetGenNode } from "../snippetGen.js";
vi.mock("../router.js", () => ({
  routerNode: vi.fn(async () => ({
    routerOutput: {
      needsDocs: false,
      needsErrorCheck: true,
      needsSnippet: false,
      confidence: 1,
      reasoning: "error check requested",
    },
  })),
}));

vi.mock("../specExtractor.js", () => ({
  specExtractorNode: vi.fn(async () => ({
    specs: [
      {
        agentType: "error_check",
        requirements: ["check the reported error"],
        derivedFrom: "userEvent",
        confidence: 1,
        reasoning: "test",
      },
    ],
  })),
}));

vi.mock("../errorCheck.js", () => ({
  errorCheckNode: vi.fn(async (state: any) => ({
    drafts: [
      {
        agentType: "error_check",
        content: `error-check attempt ${state.attemptNumber}`,
        toolsUsed: [],
        attemptNumber: state.attemptNumber,
      },
    ],
  })),
}));

vi.mock("../docGen.js", () => ({
  docGenNode: vi.fn(async () => ({
    drafts: [
      {
        agentType: "doc_gen",
        content: "unexpected doc branch",
        toolsUsed: [],
        attemptNumber: 1,
      },
    ],
  })),
}));

vi.mock("../snippetGen.js", () => ({
  snippetGenNode: vi.fn(async () => ({
    drafts: [
      {
        agentType: "snippet_gen",
        content: "unexpected snippet branch",
        toolsUsed: [],
        attemptNumber: 1,
      },
    ],
  })),
}));

vi.mock("../critic.js", () => ({
  criticNode: vi.fn(async (state: any) => {
    const currentDrafts = state.drafts.filter(
      (draft: any) => draft.attemptNumber === state.attemptNumber,
    );

    return {
      criticVerdicts: currentDrafts.map((draft: any) => ({
        agentType: draft.agentType,
        accepted: state.attemptNumber >= 2,
        reason:
          state.attemptNumber >= 2
            ? "accepted on retry"
            : "rejected for retry",
        unmetRequirements:
          state.attemptNumber >= 2 ? [] : ["check the reported error"],
      })),
      pendingRetryTargets:
        state.attemptNumber >= 2
          ? []
          : currentDrafts.map((draft: any) => draft.agentType),
    };
  }),
}));

vi.mock("../executor.js", () => ({
  executorNode: vi.fn(async () => ({
    executorResult: {
      stdout: "",
      stderr: "",
      exitCode: 0,
      durationMs: 1,
      signal: null,
    },
  })),
}));

vi.mock("../failureTriage.js", () => ({
  failureTriageNode: vi.fn(async () => ({
    failureTriage: null,
  })),
}));

vi.mock("../criticHitlPause.js", () => ({
  criticHitlPauseNode: vi.fn(async () => ({
    status: "awaiting_hitl_critic_reject",
  })),
}));



describe("buildGraph", () => {
  it("routes a rejected error_check branch back to error_check after attempt_bump", async () => {
    const graph = buildGraph();

    await graph.invoke({
      sessionId: "test-session",
      userEvent: "check this error",
      currentFileContent: "const x = ;",
      hitlEnabled: {
        lowConfidence: false,
        attempt3Rejection: false,
      },
    });

    expect(errorCheckNode).toHaveBeenCalledTimes(2);
    expect(docGenNode).not.toHaveBeenCalled();
    expect(snippetGenNode).not.toHaveBeenCalled();

    const attempts = (errorCheckNode as any).mock.calls.map(
      (call: any[]) => call[0].attemptNumber,
    );

    expect(attempts).toEqual([1, 2]);
  });
});