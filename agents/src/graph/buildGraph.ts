import { StateGraph, START, END } from "@langchain/langgraph";
import { GraphState, GraphStateType } from "./state.js";
import { routerNode } from "./nodes/router.js";
import { specExtractorNode } from "./nodes/specExtractor.js";
import { errorCheckNode } from "./nodes/errorCheck.js";
import { docGenNode } from "./nodes/docGen.js";
import { snippetGenNode } from "./nodes/snippetGen.js";
import { criticNode } from "./nodes/critic.js";
import { executorNode } from "./nodes/executor.js";
import { failureTriageNode } from "./nodes/failureTriage.js";
import { attemptBumpNode } from "./nodes/attemptBump.js";
import { criticHitlPauseNode } from "./nodes/criticHitlPause.js";

export function buildGraph() {
  const graph = new StateGraph(GraphState)
    .addNode("router", routerNode)
    .addNode("spec_extractor", specExtractorNode)
    .addNode("error_check", errorCheckNode)
    .addNode("doc_gen", docGenNode)
    .addNode("snippet_gen", snippetGenNode)
    .addNode("critic", criticNode)
    .addNode("executor", executorNode)
    .addNode("failure_triage", failureTriageNode)
    .addNode("attempt_bump", attemptBumpNode)
    .addNode("attempt_bump_snippet", attemptBumpNode)
    .addNode("critic_hitl_pause", criticHitlPauseNode)

    .addEdge(START, "router")
    .addEdge("router", "spec_extractor")

    .addConditionalEdges("spec_extractor", (state: GraphStateType) => {
      const branches: string[] = [];
      if (state.routerOutput?.needsErrorCheck) branches.push("error_check");
      if (state.routerOutput?.needsDocs) branches.push("doc_gen");
      if (state.routerOutput?.needsSnippet) branches.push("snippet_gen");
      return branches.length > 0 ? branches : ["doc_gen"];
    })

    .addEdge("error_check", "critic")
    .addEdge("doc_gen", "critic")
    .addEdge("snippet_gen", "critic")

    .addConditionalEdges("critic", (state: GraphStateType) => {
      const currentAttemptDrafts = state.drafts.filter((d) => d.attemptNumber === state.attemptNumber);
      const currentVerdicts = state.criticVerdicts.slice(-currentAttemptDrafts.length);
      const allAccepted = currentVerdicts.length > 0 && currentVerdicts.every((v) => v.accepted);

      if (allAccepted) {
        const hasSnippetDraft = currentAttemptDrafts.some((d) => d.agentType === "snippet_gen");
        return hasSnippetDraft ? "executor" : END;
      }

      if (state.attemptNumber >= 3) {
        // Controllable autonomy: attempt-3 HITL toggle, default OFF.
        return state.hitlEnabled.attempt3Rejection ? "critic_hitl_pause" : END;
      }

      // Retry: bump the attempt counter first (attempt_bump's own outgoing
      // edge reads pendingRetryTargets, set above by criticNode, to fan out
      // to the specific rejected branch(es)).
      return "attempt_bump";
    }, {
      executor: "executor",
      attempt_bump: "attempt_bump",
      critic_hitl_pause: "critic_hitl_pause",
      [END]: END,
    })

    .addEdge("critic_hitl_pause", END)

    .addConditionalEdges("attempt_bump", (state: GraphStateType) => {
      return state.pendingRetryTargets.length > 0 ? state.pendingRetryTargets : ["doc_gen"];
    }, {
      error_check: "error_check",
      doc_gen: "doc_gen",
      snippet_gen: "snippet_gen",
    })

    .addConditionalEdges("executor", (state: GraphStateType) => {
      const result = state.executorResult;
      if (result && result.exitCode === 0) return END;
      return "failure_triage";
    }, {
      [END]: END,
      failure_triage: "failure_triage",
    })

    .addConditionalEdges("failure_triage", (state: GraphStateType) => {
      if (state.attemptNumber >= 3) return END;
      return "attempt_bump_snippet";
    }, {
      [END]: END,
      attempt_bump_snippet: "attempt_bump_snippet",
    })

    .addEdge("attempt_bump_snippet", "snippet_gen");

  return graph.compile();
}